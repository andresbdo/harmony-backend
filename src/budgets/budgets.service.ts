import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto, CreateSavingDto, UpdateSavingDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
    constructor(private prisma: PrismaService) { }

    // Budget Methods
    async createBudget(userId: string, dto: CreateBudgetDto) {
        return this.prisma.budget.create({
            data: { ...dto, userId },
        });
    }

    async findAllBudgets(userId: string, year: number, month?: number) {
        return this.prisma.budget.findMany({
            where: {
                userId,
                year,
                month: month || undefined,
            },
            include: { category: true },
        });
    }

    async findOneBudget(id: string, userId: string) {
        const budget = await this.prisma.budget.findFirst({
            where: { id, userId },
            include: { category: true },
        });
        if (!budget) throw new NotFoundException('Budget not found');
        return budget;
    }

    async updateBudget(id: string, userId: string, dto: UpdateBudgetDto) {
        await this.findOneBudget(id, userId);
        return this.prisma.budget.update({
            where: { id },
            data: dto,
        });
    }

    async removeBudget(id: string, userId: string) {
        await this.findOneBudget(id, userId);
        return this.prisma.budget.delete({ where: { id } });
    }

    // Saving Methods
    async createSaving(userId: string, dto: CreateSavingDto) {
        return this.prisma.saving.create({
            data: { ...dto, userId },
        });
    }

    async findAllSavings(userId: string) {
        return this.prisma.saving.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOneSaving(id: string, userId: string) {
        const saving = await this.prisma.saving.findFirst({
            where: { id, userId },
        });
        if (!saving) throw new NotFoundException('Saving not found');
        return saving;
    }

    async updateSaving(id: string, userId: string, dto: UpdateSavingDto) {
        await this.findOneSaving(id, userId);
        return this.prisma.saving.update({
            where: { id },
            data: dto,
        });
    }

    async removeSaving(id: string, userId: string) {
        await this.findOneSaving(id, userId);
        return this.prisma.saving.delete({ where: { id } });
    }
}
