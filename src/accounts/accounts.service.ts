import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateCardDto, UpdateCardDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
    constructor(private prisma: PrismaService) { }

    // Bank Account methods
    async createAccount(userId: string, dto: CreateBankAccountDto) {
        return this.prisma.bankAccount.create({
            data: {
                ...dto,
                currentBalance: dto.initialBalance,
                userId,
            },
        });
    }

    async findAllAccounts(userId: string) {
        return this.prisma.bankAccount.findMany({
            where: { userId },
            include: { cards: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOneAccount(id: string, userId: string) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id, userId },
            include: { cards: true },
        });
        if (!account) throw new NotFoundException('Account not found');
        return account;
    }

    async updateAccount(id: string, userId: string, dto: UpdateBankAccountDto) {
        await this.findOneAccount(id, userId);
        return this.prisma.bankAccount.update({
            where: { id },
            data: dto,
        });
    }

    async removeAccount(id: string, userId: string) {
        await this.findOneAccount(id, userId);
        return this.prisma.bankAccount.delete({
            where: { id },
        });
    }

    // Card methods
    async createCard(userId: string, dto: CreateCardDto) {
        // Verify account ownership
        await this.findOneAccount(dto.linkedBankAccountId, userId);

        return this.prisma.card.create({
            data: dto,
        });
    }

    async findAllCards(userId: string) {
        return this.prisma.card.findMany({
            where: {
                linkedBankAccount: { userId },
            },
            include: { linkedBankAccount: true },
        });
    }

    async findOneCard(id: string, userId: string) {
        const card = await this.prisma.card.findFirst({
            where: {
                id,
                linkedBankAccount: { userId },
            },
            include: { linkedBankAccount: true },
        });
        if (!card) throw new NotFoundException('Card not found');
        return card;
    }

    async updateCard(id: string, userId: string, dto: UpdateCardDto) {
        await this.findOneCard(id, userId);
        return this.prisma.card.update({
            where: { id },
            data: dto,
        });
    }

    async removeCard(id: string, userId: string) {
        await this.findOneCard(id, userId);
        return this.prisma.card.delete({
            where: { id },
        });
    }
}
