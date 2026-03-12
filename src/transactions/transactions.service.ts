import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, PaymentMethod } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    private async validatePaymentMethod(dto: CreateTransactionDto | UpdateTransactionDto) {
        if (dto.paymentMethod === PaymentMethod.CARD && !dto.cardId) {
            throw new BadRequestException('cardId is required when paymentMethod is CARD');
        }
        if (dto.paymentMethod === PaymentMethod.BANK_ACCOUNT && !dto.bankAccountId) {
            throw new BadRequestException('bankAccountId is required when paymentMethod is BANK_ACCOUNT');
        }
    }

    private async recalculateBalance(bankAccountId: string): Promise<void> {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id: bankAccountId },
            select: { initialBalance: true },
        });

        if (!account) return;

        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccountId },
            select: { amount: true, type: true },
        });

        let balance = parseFloat(account.initialBalance.toString());
        for (const t of transactions) {
            const amount = parseFloat(t.amount.toString());
            if (t.type === 'INCOME') balance += amount;
            else if (t.type === 'EXPENSE') balance -= amount;
        }

        await this.prisma.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: balance },
        });
    }

    async create(userId: string, createTransactionDto: CreateTransactionDto) {
        await this.validatePaymentMethod(createTransactionDto);

        const transaction = await this.prisma.transaction.create({
            data: {
                amount: createTransactionDto.amount,
                currency: createTransactionDto.currency,
                date: new Date(createTransactionDto.date),
                description: createTransactionDto.description,
                type: createTransactionDto.type,
                categoryId: createTransactionDto.categoryId,
                userId: userId,
                workspaceId: createTransactionDto.workspaceId,
                paidByMemberId: createTransactionDto.paidByMemberId,
                paymentMethod: createTransactionDto.paymentMethod,
                bankAccountId: createTransactionDto.bankAccountId,
                cardId: createTransactionDto.cardId,
                isRecurrent: createTransactionDto.isRecurrent || false,
                recurrenceRule: createTransactionDto.recurrenceRule,
            },
        });

        if (createTransactionDto.bankAccountId) {
            await this.recalculateBalance(createTransactionDto.bankAccountId);
        }

        return transaction;
    }

    async findAll(userId: string, filters: { workspaceId?: string; categoryId?: string; type?: string }) {
        return this.prisma.transaction.findMany({
            where: {
                userId,
                ...filters,
            },
            include: {
                category: true,
                workspace: true,
            },
            orderBy: { date: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        const transaction = await this.prisma.transaction.findFirst({
            where: { id, userId },
            include: {
                category: true,
                workspace: true,
                bankAccount: true,
                card: true,
            },
        });

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        return transaction;
    }

    async update(id: string, userId: string, updateTransactionDto: UpdateTransactionDto) {
        const existing = await this.findOne(id, userId);
        await this.validatePaymentMethod(updateTransactionDto);

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                ...updateTransactionDto,
                date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
            },
        });

        const accountsToRecalculate = new Set<string>();
        if (existing.bankAccountId) accountsToRecalculate.add(existing.bankAccountId);
        if (updateTransactionDto.bankAccountId) accountsToRecalculate.add(updateTransactionDto.bankAccountId);
        for (const accountId of accountsToRecalculate) {
            await this.recalculateBalance(accountId);
        }

        return updated;
    }

    async remove(id: string, userId: string) {
        const transaction = await this.findOne(id, userId);
        await this.prisma.transaction.delete({ where: { id } });
        if (transaction.bankAccountId) {
            await this.recalculateBalance(transaction.bankAccountId);
        }
        return { deleted: true };
    }
}
