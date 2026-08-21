import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddMemberDto, UpdateMemberDto } from './dto/workspace.dto';
import { UpdateSettlementStatusDto } from './dto/settlement.dto';
import { getCurrentPeriodBounds, computePairwiseBalances } from './settlement.util';

@Injectable()
export class WorkspacesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateWorkspaceDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) throw new NotFoundException('User not found');

        return this.prisma.workspace.create({
            data: {
                ...dto,
                ownerId: userId,
                inviteToken: randomBytes(16).toString('hex'),
                members: {
                    create: {
                        userId,
                        email: user.email,
                        nameAlias: user.name ?? 'Owner',
                        responsibilityPercentage: 100,
                    },
                },
            },
            include: { members: true },
        });
    }

    async findAll(userId: string) {
        return this.prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                members: true,
            },
        });
    }

    async findOne(id: string, userId: string) {
        const workspace = await this.prisma.workspace.findFirst({
            where: {
                id,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                members: true,
                categories: true,
            },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        return workspace;
    }

    async addMember(workspaceId: string, userId: string, dto: AddMemberDto) {
        const workspace = await this.findOne(workspaceId, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can add members');

        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

        return this.prisma.workspaceMember.create({
            data: {
                ...dto,
                workspaceId,
                userId: existingUser?.id || null,
            },
        });
    }

    async calculateClosing(workspaceId: string, userId: string) {
        const workspace = await this.findOne(workspaceId, userId);

        const now = new Date();
        let periodStart: Date;
        let periodEnd: Date;

        const periodBounds = getCurrentPeriodBounds(workspace, now);
        if (periodBounds === null) {
            periodStart = workspace.createdAt;
            periodEnd = now;
        } else {
            periodStart = periodBounds.periodStart;
            periodEnd = periodBounds.periodEnd;
        }

        const transactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId,
                date: { gte: periodStart, lte: periodEnd },
            },
            include: {
                paidByMember: true,
            },
        });

        const totalSpent = transactions.reduce((acc, tx) => acc + parseFloat(tx.amount.toString()), 0);
        const balances = computePairwiseBalances(
            workspace.members.map(m => ({
                id: m.id,
                responsibilityPercentage: parseFloat(m.responsibilityPercentage.toString()),
            })),
            transactions.map(tx => ({
                amount: parseFloat(tx.amount.toString()),
                paidByMemberId: tx.paidByMemberId,
            })),
        );

        return {
            workspaceName: workspace.name,
            totalSpent,
            balances,
        };
    }

    async update(id: string, userId: string, dto: UpdateWorkspaceDto) {
        const workspace = await this.findOne(id, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can update workspaces');

        if (dto.cycle && dto.cycle !== workspace.cycle) {
            await this.closeCurrentPeriod(id);
        }

        return this.prisma.workspace.update({
            where: { id },
            data: dto,
        });
    }

    async closeNow(workspaceId: string, userId: string) {
        const workspace = await this.findOne(workspaceId, userId);
        if (workspace.cycle !== 'INDEFINITE') {
            throw new ForbiddenException('Only INDEFINITE workspaces can be manually closed');
        }

        return this.closeCurrentPeriod(workspaceId);
    }

    async listSettlements(workspaceId: string, userId: string) {
        await this.findOne(workspaceId, userId);
        return this.prisma.workspaceSettlement.findMany({
            where: { workspaceId },
            orderBy: { periodStart: 'desc' },
        });
    }

    async updateSettlementStatus(workspaceId: string, settlementId: string, userId: string, dto: UpdateSettlementStatusDto) {
        await this.findOne(workspaceId, userId);
        return this.prisma.workspaceSettlement.update({
            where: { id: settlementId },
            data: { status: dto.status },
        });
    }

    async closeCurrentPeriod(workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        const now = new Date();
        let periodStart: Date;
        let periodEnd: Date;

        const periodBounds = getCurrentPeriodBounds(workspace, now);
        if (periodBounds === null) {
            periodStart = workspace.createdAt;
            periodEnd = now;
        } else {
            periodStart = periodBounds.periodStart;
            periodEnd = periodBounds.periodEnd;
        }

        const transactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId,
                date: { gte: periodStart, lte: periodEnd },
            },
            include: {
                paidByMember: true,
            },
        });

        const balances = computePairwiseBalances(
            workspace.members.map(m => ({
                id: m.id,
                responsibilityPercentage: parseFloat(m.responsibilityPercentage.toString()),
            })),
            transactions.map(tx => ({
                amount: parseFloat(tx.amount.toString()),
                paidByMemberId: tx.paidByMemberId,
            })),
        );

        await this.prisma.workspaceSettlement.upsert({
            where: { workspaceId_periodStart: { workspaceId, periodStart } },
            create: {
                workspaceId,
                periodStart,
                periodEnd,
                balances: balances as any,
                status: 'PENDING',
            },
            update: {},
        });
    }

    async updateMember(workspaceId: string, memberId: string, userId: string, dto: UpdateMemberDto) {
        const workspace = await this.findOne(workspaceId, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can update members');

        return this.prisma.workspaceMember.update({
            where: { id: memberId },
            data: dto,
        });
    }

    async removeMember(workspaceId: string, memberId: string, userId: string) {
        const workspace = await this.findOne(workspaceId, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can remove members');

        return this.prisma.workspaceMember.delete({ where: { id: memberId } });
    }

    async remove(id: string, userId: string) {
        const workspace = await this.findOne(id, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can delete workspaces');
        if (workspace.isPersonal === true) throw new ForbiddenException('Personal workspace cannot be deleted');

        return this.prisma.workspace.delete({ where: { id } });
    }

    async joinByToken(token: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { inviteToken: token },
            include: { members: true },
        });
        if (!workspace) throw new NotFoundException('Enlace de invitación inválido');

        const alreadyMember = workspace.members.some(m => m.userId === userId);
        if (alreadyMember) {
            await this.prisma.workspace.update({
                where: { id: workspace.id },
                data: { inviteToken: null },
            });
            return workspace;
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) throw new NotFoundException('User not found');

        await this.prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                email: user.email,
                nameAlias: user.name,
                responsibilityPercentage: 0,
            },
        });

        await this.prisma.workspace.update({
            where: { id: workspace.id },
            data: { inviteToken: null },
        });

        return this.prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: { members: true },
        });
    }

    async regenerateInviteToken(workspaceId: string, userId: string) {
        const workspace = await this.findOne(workspaceId, userId);
        if (workspace.ownerId !== userId) throw new ForbiddenException('Only owners can regenerate invite tokens');

        const newToken = randomBytes(16).toString('hex');

        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { inviteToken: newToken },
        });

        return { inviteToken: newToken };
    }

    async getJoinPreview(token: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { inviteToken: token },
            include: { members: true },
        });

        if (!workspace) {
            throw new NotFoundException('Invalid or expired invite link');
        }

        return {
            id: workspace.id,
            name: workspace.name,
            memberCount: workspace.members.length,
        };
    }
}
