import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddMemberDto, UpdateMemberDto } from './dto/workspace.dto';

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

        // Check if user exists to link them
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

        // Get transactions since last cutoff or similar logic
        // For MVP, we'll fetch all transactions for the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId,
                date: { gte: startOfMonth },
            },
            include: {
                paidByMember: true,
            },
        });

        const totalSpent = transactions.reduce((acc, tx) => acc + parseFloat(tx.amount.toString()), 0);
        const members = workspace.members;

        // Calculate how much each member SHOULD have paid based on their percentage
        const summary = members.map(member => {
            const share = (totalSpent * parseFloat(member.responsibilityPercentage.toString())) / 100;
            const actualPaid = transactions
                .filter(tx => tx.paidByMemberId === member.id)
                .reduce((acc, tx) => acc + parseFloat(tx.amount.toString()), 0);

            return {
                memberId: member.id,
                name: member.nameAlias,
                share,
                actualPaid,
                balance: actualPaid - share, // Positive means they are owed money, negative means they owe
            };
        });

        return {
            workspaceName: workspace.name,
            totalSpent,
            summary,
        };
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

        return this.prisma.workspace.delete({ where: { id } });
    }

    async joinByToken(token: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { inviteToken: token },
            include: { members: true },
        });
        if (!workspace) throw new NotFoundException('Enlace de invitación inválido');

        const alreadyMember = workspace.members.some(m => m.userId === userId);
        if (alreadyMember) return workspace;

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

        return this.prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: { members: true },
        });
    }
}
