import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, PaymentMethod } from './dto/transaction.dto';
import { EncryptionService } from '../common/encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class TransactionsService {
    private readonly logger = new Logger(TransactionsService.name);

    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
        private notificationsService: NotificationsService,
        private budgetsService: BudgetsService,
    ) { }

    private decryptTx(tx: any) {
        return tx.description
            ? { ...tx, description: this.encryption.decrypt(tx.description) }
            : tx;
    }

    private stripPaymentDetails(transaction: any, requestingUserId: string): any {
        if (transaction.paidByMember?.userId !== requestingUserId) {
            return {
                ...transaction,
                bankAccountId: null,
                cardId: null,
            };
        }
        return transaction;
    }

    private async validatePaymentMethod(dto: CreateTransactionDto | UpdateTransactionDto, workspaceId: string) {
        if (dto.paymentMethod === PaymentMethod.CARD && !dto.cardId) {
            throw new BadRequestException('cardId is required when paymentMethod is CARD');
        }
        if (dto.paymentMethod === PaymentMethod.BANK_ACCOUNT && !dto.bankAccountId) {
            throw new BadRequestException('bankAccountId is required when paymentMethod is BANK_ACCOUNT');
        }

        if (dto.bankAccountId) {
            const account = await this.prisma.bankAccount.findFirst({
                where: { id: dto.bankAccountId, workspaceId },
                select: { id: true },
            });
            if (!account) throw new BadRequestException('bankAccountId does not belong to this workspace');
        }

        if (dto.cardId) {
            const card = await this.prisma.card.findFirst({
                where: { id: dto.cardId, linkedBankAccount: { workspaceId } },
                select: { id: true },
            });
            if (!card) throw new BadRequestException('cardId does not belong to this workspace');
        }
    }

    async recalculateBalance(bankAccountId: string): Promise<void> {
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

    async create(workspaceId: string, dto: CreateTransactionDto, userId: string) {
        await this.validatePaymentMethod(dto, workspaceId);

        const transaction = await this.prisma.transaction.create({
            data: {
                amount: dto.amount,
                currency: dto.currency,
                date: new Date(dto.date),
                description: dto.description ? this.encryption.encrypt(dto.description) : null,
                type: dto.type,
                categoryId: dto.categoryId,
                workspaceId,
                paidByMemberId: dto.paidByMemberId,
                paymentMethod: dto.paymentMethod || null,
                bankAccountId: dto.bankAccountId,
                cardId: dto.cardId,
                savingGoalId: dto.savingGoalId,
                isRecurrent: dto.isRecurrent || false,
                recurrenceRule: dto.recurrenceRule,
                installmentPurchaseId: dto.installmentPurchaseId,
                installmentNumber: dto.installmentNumber,
            },
        });

        if (dto.bankAccountId) {
            await this.recalculateBalance(dto.bankAccountId);
        }

        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const result = await this.budgetsService.checkExceeded(workspaceId, dto.categoryId, month, year);

            if (result.exceeded) {
                await this.notificationsService.create(userId, {
                    type: 'BUDGET_EXCEEDED',
                    message: `Budget exceeded for category`,
                });
            }
        } catch (err) { this.logger.warn('Budget check failed', err instanceof Error ? err.message : String(err)); }

        return this.decryptTx(transaction);
    }

    async findAll(workspaceId: string, filters: any, requestingUserId?: string) {
        const { year, month, workspaceId: _ignored, ...rest } = filters ?? {};
        const where: any = { workspaceId, ...rest };

        if (year) {
            const y = parseInt(year, 10);
            const m = month ? parseInt(month, 10) : undefined;
            // Users are Argentina-based (UTC-3); compute month boundaries in ART regardless
            // of the server's own timezone, so a transaction dated "the 1st" in the app
            // isn't bucketed into the previous month by a UTC-anchored server.
            const from = m !== undefined ? new Date(Date.UTC(y, m - 1, 1, 3, 0, 0)) : new Date(Date.UTC(y, 0, 1, 3, 0, 0));
            const to = m !== undefined ? new Date(Date.UTC(y, m, 1, 3, 0, 0)) : new Date(Date.UTC(y + 1, 0, 1, 3, 0, 0));
            where.date = { gte: from, lt: to };
        }

        const transactions = await this.prisma.transaction.findMany({
            where,
            include: {
                category: true,
                workspace: true,
                paidByMember: true,
                installmentPurchase: { select: { totalInstallments: true } },
            },
            orderBy: { date: 'desc' },
        });
        return transactions.map(tx => {
            const decrypted = this.decryptTx(tx);
            return requestingUserId ? this.stripPaymentDetails(decrypted, requestingUserId) : decrypted;
        });
    }

    async findOne(id: string, workspaceId: string, requestingUserId?: string) {
        const tx = await this.prisma.transaction.findFirst({
            where: { id, workspaceId },
            include: {
                category: true,
                workspace: true,
                bankAccount: true,
                card: true,
                paidByMember: true,
            },
        });

        if (!tx) {
            throw new NotFoundException(`Transacción no encontrada`);
        }

        const decrypted = this.decryptTx(tx);
        return requestingUserId ? this.stripPaymentDetails(decrypted, requestingUserId) : decrypted;
    }

    async update(id: string, workspaceId: string, updateTransactionDto: UpdateTransactionDto) {
        const existing = await this.findOne(id, workspaceId);
        await this.validatePaymentMethod(updateTransactionDto, workspaceId);

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                ...updateTransactionDto,
                description: updateTransactionDto.description
                    ? this.encryption.encrypt(updateTransactionDto.description)
                    : undefined,
                date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
            },
        });

        const accountsToRecalculate = new Set<string>();
        if (existing.bankAccountId) accountsToRecalculate.add(existing.bankAccountId);
        if (updateTransactionDto.bankAccountId) accountsToRecalculate.add(updateTransactionDto.bankAccountId);
        for (const accountId of accountsToRecalculate) {
            await this.recalculateBalance(accountId);
        }

        return this.decryptTx(updated);
    }

    async remove(id: string, workspaceId: string) {
        const transaction = await this.findOne(id, workspaceId);
        await this.prisma.transaction.delete({ where: { id } });
        if (transaction.bankAccountId) {
            await this.recalculateBalance(transaction.bankAccountId);
        }
        return { deleted: true };
    }

    async getPendingPayments(userId: string) {
        const payments = await this.prisma.transaction.findMany({
            where: {
                paidByMember: {
                    userId,
                },
                paymentMethod: null,
            },
            include: {
                workspace: true,
                category: true,
                paidByMember: true,
            },
            orderBy: { date: 'desc' },
        });
        return payments.map(p => ({
            ...this.decryptTx(p),
            workspaceName: p.workspace?.name,
        }));
    }

    async assignPaymentMethod(
        transactionId: string,
        userId: string,
        dto: { paymentMethod: PaymentMethod; bankAccountId?: string; cardId?: string },
    ) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { paidByMember: true },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (transaction.paidByMember?.userId !== userId) {
            throw new ForbiddenException('Cannot assign payment method to another user\'s transaction');
        }

        const updated = await this.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                paymentMethod: dto.paymentMethod,
                bankAccountId: dto.bankAccountId || null,
                cardId: dto.cardId || null,
            },
            include: {
                category: true,
                workspace: true,
                paidByMember: true,
            },
        });

        if (dto.bankAccountId) {
            await this.recalculateBalance(dto.bankAccountId);
        }

        return this.decryptTx(updated);
    }
}
