import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, PaymentMethod } from './dto/transaction.dto';
import { EncryptionService } from 'src/common/encryption/encryption.service';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    private decryptTx(tx: any) {
        return tx.description
            ? { ...tx, description: this.encryption.decrypt(tx.description) }
            : tx;
    }

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

    async create(workspaceId: string, dto: CreateTransactionDto) {
        await this.validatePaymentMethod(dto);

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
                paymentMethod: dto.paymentMethod,
                bankAccountId: dto.bankAccountId,
                cardId: dto.cardId,
                isRecurrent: dto.isRecurrent || false,
                recurrenceRule: dto.recurrenceRule,
            },
        });

        if (dto.bankAccountId) {
            await this.recalculateBalance(dto.bankAccountId);
        }

        return this.decryptTx(transaction);
    }

    async findAll(workspaceId: string, filters: any) {
        const transactions = await this.prisma.transaction.findMany({
            where: { workspaceId, ...filters },
            include: {
                category: true,
                workspace: true,
            },
            orderBy: { date: 'desc' },
        });
        return transactions.map(this.decryptTx.bind(this));
    }

    async findOne(id: string, workspaceId: string) {
        const tx = await this.prisma.transaction.findFirst({
            where: { id, workspaceId },
            include: {
                category: true,
                workspace: true,
                bankAccount: true,
                card: true,
            },
        });

        if (!tx) {
            throw new NotFoundException(`Transacción no encontrada`);
        }

        return this.decryptTx(tx);
    }

    async update(id: string, workspaceId: string, updateTransactionDto: UpdateTransactionDto) {
        const existing = await this.findOne(id, workspaceId);
        await this.validatePaymentMethod(updateTransactionDto);

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
}
