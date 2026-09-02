import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentPeriodBounds } from '../workspaces/settlement.util';
import { CreateExpenseGroupDto, UpdateExpenseGroupDto, AssignCategoriesDto } from './dto/expense-group.dto';

@Injectable()
export class ExpenseGroupsService {
    constructor(private prisma: PrismaService) { }

    private async getPeriodBounds(workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { cycle: true, cutoffDay: true, weekStartDay: true, yearStartMonth: true },
        });
        if (!workspace) throw new NotFoundException('Workspace no encontrado');
        return getCurrentPeriodBounds(workspace, new Date());
    }

    async create(workspaceId: string, dto: CreateExpenseGroupDto) {
        return this.prisma.expenseGroup.create({
            data: { workspaceId, name: dto.name, icon: dto.icon, color: dto.color },
        });
    }

    async findOneOrThrow(id: string, workspaceId: string) {
        const group = await this.prisma.expenseGroup.findFirst({
            where: { id, workspaceId },
            include: { categories: { select: { id: true, name: true } } },
        });
        if (!group) throw new NotFoundException('Grupo de gastos no encontrado');
        return group;
    }

    private async enrichWithPeriod<T extends { id: string }>(group: T, workspaceId: string, bounds: Awaited<ReturnType<typeof getCurrentPeriodBounds>>) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId,
                expenseGroupId: group.id,
                type: 'EXPENSE',
                ...(bounds ? { date: { gte: bounds.periodStart, lte: bounds.periodEnd } } : {}),
            },
            select: { amount: true, reconciled: true },
        });

        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        const reconciled = transactions.length > 0 && transactions.every(t => t.reconciled);

        return {
            ...group,
            periodStart: bounds?.periodStart ?? null,
            periodEnd: bounds?.periodEnd ?? null,
            periodTotal: total,
            transactionCount: transactions.length,
            reconciled,
        };
    }

    async findAll(workspaceId: string) {
        const groups = await this.prisma.expenseGroup.findMany({
            where: { workspaceId },
            include: { categories: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        });

        const bounds = await this.getPeriodBounds(workspaceId);
        return Promise.all(groups.map((group) => this.enrichWithPeriod(group, workspaceId, bounds)));
    }

    async findOne(id: string, workspaceId: string) {
        const group = await this.findOneOrThrow(id, workspaceId);
        const bounds = await this.getPeriodBounds(workspaceId);
        return this.enrichWithPeriod(group, workspaceId, bounds);
    }

    async update(id: string, workspaceId: string, dto: UpdateExpenseGroupDto) {
        await this.findOneOrThrow(id, workspaceId);
        return this.prisma.expenseGroup.update({ where: { id }, data: dto });
    }

    async remove(id: string, workspaceId: string) {
        await this.findOneOrThrow(id, workspaceId);
        return this.prisma.expenseGroup.delete({ where: { id } });
    }

    async assignCategories(id: string, workspaceId: string, userId: string, dto: AssignCategoriesDto) {
        await this.findOneOrThrow(id, workspaceId);

        const categories = await this.prisma.category.findMany({
            where: { id: { in: dto.categoryIds } },
        });

        const invalid = categories.filter(
            c => !(
                c.scope === 'GLOBAL' ||
                (c.scope === 'PERSONAL' && c.userId === userId) ||
                (c.scope === 'WORKSPACE' && c.workspaceId === workspaceId)
            ),
        );
        if (invalid.length > 0 || categories.length !== dto.categoryIds.length) {
            throw new BadRequestException('Categoría inválida para este workspace');
        }

        await this.prisma.category.updateMany({
            where: { id: { in: dto.categoryIds } },
            data: { expenseGroupId: id },
        });

        return this.findOneOrThrow(id, workspaceId);
    }

    async unassignCategory(id: string, workspaceId: string, categoryId: string) {
        await this.findOneOrThrow(id, workspaceId);
        await this.prisma.category.updateMany({
            where: { id: categoryId, expenseGroupId: id },
            data: { expenseGroupId: null },
        });
        return this.findOneOrThrow(id, workspaceId);
    }

    async getPeriodTransactions(id: string, workspaceId: string) {
        await this.findOneOrThrow(id, workspaceId);
        const bounds = await this.getPeriodBounds(workspaceId);

        return this.prisma.transaction.findMany({
            where: {
                workspaceId,
                expenseGroupId: id,
                type: 'EXPENSE',
                ...(bounds ? { date: { gte: bounds.periodStart, lte: bounds.periodEnd } } : {}),
            },
            include: { category: true, paidByMember: true },
            orderBy: { date: 'desc' },
        });
    }

    async reconcile(id: string, workspaceId: string) {
        await this.findOneOrThrow(id, workspaceId);
        const bounds = await this.getPeriodBounds(workspaceId);

        const { count } = await this.prisma.transaction.updateMany({
            where: {
                workspaceId,
                expenseGroupId: id,
                type: 'EXPENSE',
                reconciled: false,
                ...(bounds ? { date: { gte: bounds.periodStart, lte: bounds.periodEnd } } : {}),
            },
            data: { reconciled: true },
        });

        return { reconciled: count };
    }
}
