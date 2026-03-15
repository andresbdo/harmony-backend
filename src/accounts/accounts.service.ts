import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/common/encryption/encryption.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateCardDto, UpdateCardDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private decryptAccount(account: any) {
    return { ...account, name: this.encryption.decrypt(account.name) };
  }

  private decryptCard(card: any) {
    return { ...card, name: this.encryption.decrypt(card.name) };
  }

  async createAccount(workspaceId: string, dto: CreateBankAccountDto) {
    const account = await this.prisma.bankAccount.create({
      data: {
        workspaceId,
        name: this.encryption.encrypt(dto.name),
        type: dto.type,
        currency: dto.currency,
        initialBalance: dto.initialBalance,
        currentBalance: dto.initialBalance,
      },
    });
    return this.decryptAccount(account);
  }

  async findAllAccounts(workspaceId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { workspaceId },
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
