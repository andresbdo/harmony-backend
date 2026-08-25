import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateInstallmentPurchaseDto, InstallmentDateMode } from './dto/installment.dto';
import { PaymentMethod, TransactionType } from '../transactions/dto/transaction.dto';
import { nextOccurrenceOfDay } from './installment-dates.util';

@Injectable()
export class InstallmentsService {
    constructor(
        private prisma: PrismaService,
        private transactionsService: TransactionsService,
    ) { }

    private async assertMembership(userId: string, workspaceId: string) {
        const member = await this.prisma.workspaceMember.findFirst({ where: { workspaceId, userId } });
        if (!member) throw new ForbiddenException('Access denied');
    }

    private async resolveChargeDay(dto: CreateInstallmentPurchaseDto): Promise<number> {
        if (dto.dateMode === InstallmentDateMode.STATEMENT) {
            if (dto.paymentMethod !== PaymentMethod.CARD || !dto.cardId) {
                throw new BadRequestException('dateMode STATEMENT requires paymentMethod CARD and a cardId');
            }
            const card = await this.prisma.card.findUnique({ where: { id: dto.cardId } });
            if (!card) throw new BadRequestException('cardId not found');
            if (card.type !== 'CREDIT') {
                throw new BadRequestException('dateMode STATEMENT requires a CREDIT card (débito no tiene resumen)');
            }
            return card.statementCloseDay;
        }

        if (!dto.fixedDay) {
            throw new BadRequestException('fixedDay is required when dateMode is FIXED_DAY');
        }
        return dto.fixedDay;
    }

    async create(userId: string, dto: CreateInstallmentPurchaseDto) {
        await this.assertMembership(userId, dto.workspaceId);
        const day = await this.resolveChargeDay(dto);

        const now = new Date();
        const nextChargeDate = nextOccurrenceOfDay(now, day);

        const purchase = await this.prisma.installmentPurchase.create({
            data: {
                description: dto.description,
                installmentAmount: dto.installmentAmount,
                totalInstallments: dto.totalInstallments,
                installmentsPaid: 1,
                currency: dto.currency,
                type: TransactionType.EXPENSE,
                categoryId: dto.categoryId,
                workspaceId: dto.workspaceId,
                paidByMemberId: dto.paidByMemberId,
                paymentMethod: dto.paymentMethod || null,
                bankAccountId: dto.bankAccountId,
                cardId: dto.cardId,
                dateMode: dto.dateMode,
                fixedDay: dto.dateMode === InstallmentDateMode.FIXED_DAY ? dto.fixedDay : null,
                nextChargeDate,
            },
        });

        await this.transactionsService.create(
            dto.workspaceId,
            {
                amount: dto.installmentAmount,
                currency: dto.currency,
                date: now.toISOString(),
                description: dto.description,
                type: TransactionType.EXPENSE,
                categoryId: dto.categoryId,
                paymentMethod: dto.paymentMethod,
                bankAccountId: dto.bankAccountId,
                cardId: dto.cardId,
                paidByMemberId: dto.paidByMemberId,
                workspaceId: dto.workspaceId,
                installmentPurchaseId: purchase.id,
                installmentNumber: 1,
            },
            userId,
        );

        return purchase;
    }

    async findAll(userId: string) {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId },
            select: { workspaceId: true },
        });
        const workspaceIds = memberships.map(m => m.workspaceId);
        return this.prisma.installmentPurchase.findMany({
            where: { workspaceId: { in: workspaceIds } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        const purchase = await this.prisma.installmentPurchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Installment purchase not found');
        await this.assertMembership(userId, purchase.workspaceId);
        return purchase;
    }

    async cancel(id: string, userId: string) {
        const purchase = await this.prisma.installmentPurchase.findUnique({ where: { id } });
        if (!purchase) throw new NotFoundException('Installment purchase not found');
        await this.assertMembership(userId, purchase.workspaceId);
        return this.prisma.installmentPurchase.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
