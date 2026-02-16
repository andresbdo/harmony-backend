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

    async create(userId: string, createTransactionDto: CreateTransactionDto) {
        await this.validatePaymentMethod(createTransactionDto);

        return this.prisma.transaction.create({
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
        await this.findOne(id, userId);
        await this.validatePaymentMethod(updateTransactionDto);

        return this.prisma.transaction.update({
            where: { id },
            data: {
                ...updateTransactionDto,
                date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
            },
        });
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId);
        return this.prisma.transaction.delete({
            where: { id },
        });
    }
}
