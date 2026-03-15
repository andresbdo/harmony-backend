import { Injectable, NotFoundException } from '@nestjs/common';
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
    return saving.description
      ? { ...saving, description: this.encryption.decrypt(saving.description) }
      : saving;
  }

  // Budget Methods
  async createBudget(workspaceId: string, dto: CreateBudgetDto) {
    return this.prisma.budget.create({
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
        amount: dto.amount,
        currency: dto.currency,
        description: dto.description ? this.encryption.encrypt(dto.description) : null,
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
        ...dto,
        description: dto.description ? this.encryption.encrypt(dto.description) : undefined,
      },
    });
    return this.decryptSaving(updated);
  }

  async removeSaving(id: string, workspaceId: string) {
    await this.findOneSaving(id, workspaceId);
    return this.prisma.saving.delete({ where: { id } });
  }
}
