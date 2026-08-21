import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/common/encryption/encryption.service';
import { CreateBudgetDto, UpdateBudgetDto, CreateSavingDto, UpdateSavingDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private decryptSaving(saving: any) {
    return {
      ...saving,
      amount: saving.targetAmount,
      description: saving.name ? this.encryption.decrypt(saving.name) : undefined,
    };
  }

  // Budget Methods
  async createBudget(workspaceId: string, dto: CreateBudgetDto) {
    const existing = await this.prisma.budget.findFirst({
      where: {
        workspaceId,
        type: dto.type,
        categoryId: dto.categoryId ?? null,
        month: dto.month,
        year: dto.year,
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe un presupuesto para esta categoría en este mes');
    }

    try {
      return await this.prisma.budget.create({
        data: {
          workspaceId,
          amount: dto.amount,
          currency: dto.currency,
          type: dto.type,
          categoryId: dto.categoryId,
          month: dto.month,
          year: dto.year,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un presupuesto para esta categoría en este mes');
      }
      throw error;
    }
  }

  async findAllBudgets(workspaceId: string, year: number, month?: number) {
    return this.prisma.budget.findMany({
      where: { workspaceId, year, month: month || undefined },
      include: { category: true },
    });
  }

  async findOneBudget(id: string, workspaceId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, workspaceId },
      include: { category: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async updateBudget(id: string, workspaceId: string, dto: UpdateBudgetDto) {
    await this.findOneBudget(id, workspaceId);
    return this.prisma.budget.update({ where: { id }, data: dto });
  }

  async removeBudget(id: string, workspaceId: string) {
    await this.findOneBudget(id, workspaceId);
    return this.prisma.budget.delete({ where: { id } });
  }

  // Saving Methods
  async createSaving(workspaceId: string, dto: CreateSavingDto) {
    const saving = await this.prisma.saving.create({
      data: {
        workspaceId,
        targetAmount: dto.amount,
        currency: dto.currency,
        name: this.encryption.encrypt(dto.description || 'Ahorro'),
      },
    });
    return this.decryptSaving(saving);
  }

  async findAllSavings(workspaceId: string) {
    const savings = await this.prisma.saving.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return savings.map(this.decryptSaving.bind(this));
  }

  async findOneSaving(id: string, workspaceId: string) {
    const saving = await this.prisma.saving.findFirst({ where: { id, workspaceId } });
    if (!saving) throw new NotFoundException('Saving not found');
    return this.decryptSaving(saving);
  }

  async updateSaving(id: string, workspaceId: string, dto: UpdateSavingDto) {
    await this.findOneSaving(id, workspaceId);
    const updated = await this.prisma.saving.update({
      where: { id },
      data: {
        targetAmount: dto.amount,
        currency: dto.currency,
        name: dto.description ? this.encryption.encrypt(dto.description) : undefined,
      },
    });
    return this.decryptSaving(updated);
  }

  async removeSaving(id: string, workspaceId: string) {
    await this.findOneSaving(id, workspaceId);
    return this.prisma.saving.delete({ where: { id } });
  }

  async checkExceeded(
    workspaceId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<{ exceeded: boolean; budget: any | null; totalSpent: number }> {
    const budget = await this.prisma.budget.findFirst({
      where: { categoryId, month, year, workspaceId },
    });

    if (!budget) {
      return { exceeded: false, budget: null, totalSpent: 0 };
    }

    const txs = await this.prisma.transaction.findMany({
      where: {
        categoryId,
        workspaceId,
        type: 'EXPENSE',
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)),
          lt: new Date(Date.UTC(year, month, 1, 3, 0, 0)),
        },
      },
      select: { amount: true },
    });

    const totalSpent = txs.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const exceeded = totalSpent > parseFloat(budget.amount.toString());

    return { exceeded, budget, totalSpent };
  }
}
