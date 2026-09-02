import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateTransactionDto, TransactionType } from '../transactions/dto/transaction.dto';
import { SYSTEM_CATEGORY_IDS } from '../categories/system-categories.constants';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateCardDto, UpdateCardDto, AdjustBalanceDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private transactionsService: TransactionsService,
  ) {}

  private decryptAccount(account: any) {
    return { ...account, name: this.encryption.decrypt(account.name) };
  }

  private decryptCard(card: any) {
    return { ...card, name: this.encryption.decrypt(card.name) };
  }

  async createAccount(workspaceId: string, userId: string, dto: CreateBankAccountDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { isPersonal: true, ownerId: true },
    });

    if (!workspace || !workspace.isPersonal || workspace.ownerId !== userId) {
      throw new ForbiddenException('Bank accounts can only be created in your personal workspace');
    }

    const account = await this.prisma.bankAccount.create({
      data: {
        workspaceId,
        name: this.encryption.encrypt(dto.name),
        type: dto.type,
        subtype: dto.subtype ?? null,
        currency: dto.currency,
        initialBalance: dto.initialBalance,
        currentBalance: dto.initialBalance,
      },
    });
    return this.decryptAccount(account);
  }

  async findAllAccounts(workspaceId: string, userId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { workspaceId, workspace: { isPersonal: true, ownerId: userId } },
      include: { cards: true },
      orderBy: { name: 'asc' },
    });
    return accounts.map(acc => ({
      ...this.decryptAccount(acc),
      cards: acc.cards.map(this.decryptCard.bind(this)),
    }));
  }

  async findOneAccount(id: string, workspaceId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, workspaceId },
      include: { cards: true },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return this.decryptAccount(account);
  }

  async updateAccount(id: string, workspaceId: string, dto: UpdateBankAccountDto) {
    await this.findOneAccount(id, workspaceId);
    const updated = await this.prisma.bankAccount.update({
      where: { id },
      data: { ...dto, name: dto.name ? this.encryption.encrypt(dto.name) : undefined },
    });
    return this.decryptAccount(updated);
  }

  async adjustBalance(id: string, workspaceId: string, userId: string, dto: AdjustBalanceDto) {
    const account = await this.findOneAccount(id, workspaceId);
    const currentBalance = parseFloat(account.currentBalance.toString());
    const diff = dto.targetBalance - currentBalance;

    if (diff === 0) return account;

    const isIncrease = diff > 0;

    await this.transactionsService.create(
      workspaceId,
      {
        amount: Math.abs(diff),
        currency: account.currency,
        date: new Date().toISOString(),
        type: isIncrease ? TransactionType.INCOME : TransactionType.EXPENSE,
        categoryId: isIncrease ? SYSTEM_CATEGORY_IDS.ADJUST_BALANCE_INCOME : SYSTEM_CATEGORY_IDS.ADJUST_BALANCE_EXPENSE,
        workspaceId,
        bankAccountId: id,
      } as CreateTransactionDto,
      userId,
    );

    return this.findOneAccount(id, workspaceId);
  }

  async removeAccount(id: string, workspaceId: string) {
    await this.findOneAccount(id, workspaceId);
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  async createCard(workspaceId: string, dto: CreateCardDto) {
    await this.findOneAccount(dto.linkedBankAccountId, workspaceId);
    const card = await this.prisma.card.create({
      data: {
        name: this.encryption.encrypt(dto.name),
        type: dto.type,
        currency: dto.currency,
        creditLimit: dto.creditLimit,
        linkedBankAccountId: dto.linkedBankAccountId,
        statementCloseDay: dto.statementCloseDay,
        dueDay: dto.dueDay,
      },
    });
    return this.decryptCard(card);
  }

  async findAllCards(workspaceId: string) {
    const cards = await this.prisma.card.findMany({
      where: { linkedBankAccount: { workspaceId } },
      include: { linkedBankAccount: true },
      orderBy: { createdAt: 'desc' },
    });
    return cards.map(this.decryptCard.bind(this));
  }

  async findOneCard(id: string, workspaceId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, linkedBankAccount: { workspaceId } },
      include: { linkedBankAccount: true },
    });
    if (!card) throw new NotFoundException('Tarjeta no encontrada');
    return this.decryptCard(card);
  }

  async updateCard(id: string, workspaceId: string, dto: UpdateCardDto) {
    await this.findOneCard(id, workspaceId);
    const updated = await this.prisma.card.update({
      where: { id },
      data: { ...dto, name: dto.name ? this.encryption.encrypt(dto.name) : undefined },
    });
    return this.decryptCard(updated);
  }

  async removeCard(id: string, workspaceId: string) {
    await this.findOneCard(id, workspaceId);
    return this.prisma.card.delete({ where: { id } });
  }
}
