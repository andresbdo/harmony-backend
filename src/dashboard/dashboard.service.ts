import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/common/encryption/encryption.service';
import {
    DashboardSummaryDto,
    RecentTransactionDto,
    DueEventDto,
    AccountWithCardsDto,
    CalendarEvent,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) { }

    private async getUserWorkspaceIds(userId: string): Promise<string[]> {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId },
            select: { workspaceId: true },
        });
        return memberships.map(m => m.workspaceId);
    }

    async getSummary(userId: string, workspaceId?: string): Promise<DashboardSummaryDto> {
        const allWorkspaceIds = await this.getUserWorkspaceIds(userId);
        const workspaceIds = workspaceId && allWorkspaceIds.includes(workspaceId)
            ? [workspaceId]
            : allWorkspaceIds;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { preferredCurrency: true },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const preferredCurrency = user.preferredCurrency;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { workspaceId: { in: workspaceIds } },
            select: { currentBalance: true, currency: true },
        });

        const totalBalance = await Promise.all(
            bankAccounts.map(async (account) => {
                const convertedAmount = await this.convertCurrency(
                    parseFloat(account.currentBalance.toString()),
                    account.currency,
                    preferredCurrency,
                    currentDate,
                );
                return {
                    amount: convertedAmount,
                    currency: account.currency,
                };
            }),
        );

        const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 3, 0, 0));
        const startOfNextMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 3, 0, 0));

        const transactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                date: {
                    gte: startOfMonth,
                    lt: startOfNextMonth,
                },
            },
            select: {
                amount: true,
                currency: true,
                type: true,
            },
        });

        let monthlyIncome = 0;
        let monthlyExpenses = 0;

        for (const tx of transactions) {
            const convertedAmount = await this.convertCurrency(
                parseFloat(tx.amount.toString()),
                tx.currency,
                preferredCurrency,
                currentDate,
            );

            if (tx.type === 'INCOME') {
                monthlyIncome += convertedAmount;
            } else if (tx.type === 'EXPENSE') {
                monthlyExpenses += convertedAmount;
            }
        }

        const budgetRemaining = await this.calculateBudgetRemaining(
            workspaceIds,
            currentMonth,
            currentYear,
            preferredCurrency,
            monthlyExpenses,
        );

        const savings = await this.prisma.saving.findMany({
            where: { workspaceId: { in: workspaceIds } },
            select: { targetAmount: true, currency: true },
        });

        let totalSavings = 0;
        for (const saving of savings) {
            const convertedAmount = await this.convertCurrency(
                parseFloat(saving.targetAmount.toString()),
                saving.currency,
                preferredCurrency,
                currentDate,
            );
            totalSavings += convertedAmount;
        }

        const totalBalanceAmount = totalBalance.reduce((sum, b) => sum + b.amount, 0);
        const moneyAvailable = totalBalanceAmount - totalSavings;

        const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const startOfPreviousMonth = new Date(Date.UTC(previousYear, previousMonth - 1, 1, 3, 0, 0));

        const previousTransactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                date: {
                    gte: startOfPreviousMonth,
                    lt: startOfMonth,
                },
            },
            select: {
                amount: true,
                currency: true,
                type: true,
            },
        });

        let previousMonthIncome = 0;
        let previousMonthExpenses = 0;

        for (const tx of previousTransactions) {
            const convertedAmount = await this.convertCurrency(
                parseFloat(tx.amount.toString()),
                tx.currency,
                preferredCurrency,
                currentDate,
            );

            if (tx.type === 'INCOME') {
                previousMonthIncome += convertedAmount;
            } else if (tx.type === 'EXPENSE') {
                previousMonthExpenses += convertedAmount;
            }
        }

        const incomeTrend =
            previousMonthIncome > 0
                ? ((monthlyIncome - previousMonthIncome) / previousMonthIncome) * 100
                : 0;

        const expenseTrend =
            previousMonthExpenses > 0
                ? ((monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
                : 0;

        return {
            totalBalance,
            budgetRemaining,
            moneyAvailable,
            monthlyIncome,
            monthlyExpenses,
            incomeTrend,
            expenseTrend,
        };
    }

    async getRecentTransactions(
        userId: string,
        limit: number = 10,
    ): Promise<RecentTransactionDto[]> {
        const workspaceIds = await this.getUserWorkspaceIds(userId);

        const allTransactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId: { in: workspaceIds },
            },
            include: {
                category: true,
                user: true,
                workspace: true,
                paidByMember: true,
            },
            orderBy: { date: 'desc' },
            take: limit,
        });

        return allTransactions.map((tx) => ({
            id: tx.id,
            amount: parseFloat(tx.amount.toString()),
            currency: tx.currency,
            date: tx.date,
            description: tx.description ? this.encryption.decrypt(tx.description) : null,
            type: tx.type,
            category: {
                name: tx.category.name,
                color: tx.category.color,
                icon: tx.category.icon,
            },
            payer: tx.paidByMember
                ? tx.paidByMember.nameAlias
                : tx.user ? `${tx.user.name} ${tx.user.lastName}` : 'Desconocido',
            paymentMethod: tx.paymentMethod,
            workspace: tx.workspace ? { name: tx.workspace.name, color: tx.workspace.color } : null,
        }));
    }

    async getDueEvents(
        userId: string,
        from: Date,
        to: Date,
    ): Promise<DueEventDto[]> {
        const workspaceIds = await this.getUserWorkspaceIds(userId);
        const events: DueEventDto[] = [];

        const cards = await this.prisma.card.findMany({
            where: {
                linkedBankAccount: { workspaceId: { in: workspaceIds } },
            },
        });

        for (const card of cards) {
            const cardName = this.encryption.decrypt(card.name);
            const currentDate = new Date(from);
            while (currentDate <= to) {
                const statementCloseDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    card.statementCloseDay,
                );
                const dueDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    card.dueDay,
                );

                if (statementCloseDate >= from && statementCloseDate <= to) {
                    events.push({
                        id: `card-close-${card.id}-${statementCloseDate.getTime()}`,
                        date: statementCloseDate,
                        description: `Cierre de ${cardName}`,
                        amount: null,
                        type: 'CARD_STATEMENT_CLOSE',
                        currency: null,
                    });
                }

                if (dueDate >= from && dueDate <= to) {
                    events.push({
                        id: `card-due-${card.id}-${dueDate.getTime()}`,
                        date: dueDate,
                        description: `Vencimiento de ${cardName}`,
                        amount: null,
                        type: 'CARD_DUE',
                        currency: null,
                    });
                }

                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        const recurrentTransactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                isRecurrent: true,
            },
            include: {
                category: true,
            },
        });

        for (const tx of recurrentTransactions) {
            if (tx.recurrenceRule) {
                const rule = tx.recurrenceRule as any;
                if (rule.frequency === 'MONTHLY') {
                    const currentDate = new Date(from);
                    while (currentDate <= to) {
                        const nextOccurrence = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            rule.dayOfMonth || tx.date.getDate(),
                        );

                        if (nextOccurrence >= from && nextOccurrence <= to) {
                            events.push({
                                id: `recurrent-${tx.id}-${nextOccurrence.getTime()}`,
                                date: nextOccurrence,
                                description: tx.description
                                    ? this.encryption.decrypt(tx.description)
                                    : tx.category.name,
                                amount: parseFloat(tx.amount.toString()),
                                type: 'RECURRENT_TRANSACTION',
                                currency: tx.currency,
                            });
                        }

                        currentDate.setMonth(currentDate.getMonth() + 1);
                    }
                }
            }
        }

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    async getAccounts(userId: string): Promise<AccountWithCardsDto[]> {
        const workspaceIds = await this.getUserWorkspaceIds(userId);

        const accounts = await this.prisma.bankAccount.findMany({
            where: { workspaceId: { in: workspaceIds } },
            include: {
                cards: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return accounts.map((account) => ({
            id: account.id,
            name: this.encryption.decrypt(account.name),
            type: account.type,
            currency: account.currency,
            currentBalance: parseFloat(account.currentBalance.toString()),
            cards: account.cards.map((card) => ({
                id: card.id,
                name: this.encryption.decrypt(card.name),
                type: card.type,
                statementCloseDay: card.statementCloseDay,
                dueDay: card.dueDay,
            })),
        }));
    }

    async getCalendarEvents(
        userId: string,
        workspaceId: string | null,
        month: number,
        year: number,
    ): Promise<CalendarEvent[]> {
        const workspaces = await this.prisma.workspace.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
                ...(workspaceId ? { id: workspaceId } : {}),
            },
            select: { id: true },
        });

        const workspaceIds = workspaces.map(w => w.id);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const events: CalendarEvent[] = [];

        const subscriptions = await this.prisma.subscription.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                isActive: true,
                nextBillingDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        for (const subscription of subscriptions) {
            events.push({
                date: subscription.nextBillingDate.toISOString(),
                type: 'SUBSCRIPTION',
                title: subscription.name,
                color: '#8B5CF6',
                amount: Number(subscription.amount),
                currency: subscription.currency,
            });
        }

        const recurringTransactions = await this.prisma.transaction.findMany({
            where: {
                workspaceId: { in: workspaceIds },
                isRecurrent: true,
            },
            include: {
                category: true,
            },
        });

        for (const transaction of recurringTransactions) {
            if (transaction.recurrenceRule) {
                const rule = transaction.recurrenceRule as any;
                if (rule.frequency === 'MONTHLY') {
                    const currentDate = new Date(startDate);
                    while (currentDate <= endDate) {
                        const nextOccurrence = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            rule.dayOfMonth || transaction.date.getDate(),
                        );

                        if (nextOccurrence >= startDate && nextOccurrence <= endDate) {
                            events.push({
                                date: nextOccurrence.toISOString(),
                                type: 'RECURRING',
                                title: transaction.description
                                    ? this.encryption.decrypt(transaction.description)
                                    : transaction.category.name,
                                color: '#3B82F6',
                                amount: Number(transaction.amount),
                                currency: transaction.currency,
                            });
                        }

                        currentDate.setMonth(currentDate.getMonth() + 1);
                    }
                }
            }
        }

        const userWorkspace = await this.prisma.workspace.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (userWorkspace) {
            const userBankAccounts = await this.prisma.bankAccount.findMany({
                where: { workspaceId: userWorkspace.id },
                include: { cards: true },
            });

            for (const account of userBankAccounts) {
                for (const card of account.cards) {
                    const dueDate = new Date(year, month - 1, card.dueDay);
                    if (dueDate >= startDate && dueDate <= endDate) {
                        events.push({
                            date: dueDate.toISOString(),
                            type: 'CARD_DUE',
                            title: this.encryption.decrypt(card.name) + ' due',
                            color: '#EF4444',
                        });
                    }

                    const closeDate = new Date(year, month - 1, card.statementCloseDay);
                    if (closeDate >= startDate && closeDate <= endDate) {
                        events.push({
                            date: closeDate.toISOString(),
                            type: 'CARD_CLOSE',
                            title: this.encryption.decrypt(card.name) + ' close',
                            color: '#F97316',
                        });
                    }
                }
            }
        }

        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    private async convertCurrency(
        amount: number,
        fromCurrency: string,
        toCurrency: string,
        date: Date,
    ): Promise<number> {
        if (fromCurrency === toCurrency) {
            return amount;
        }

        const exchangeRate = await this.prisma.exchangeRate.findFirst({
            where: {
                fromCurrency,
                toCurrency,
                date: {
                    lte: date,
                },
            },
            orderBy: {
                date: 'desc',
            },
        });

        if (!exchangeRate) {
            console.warn(
                `No exchange rate found for ${fromCurrency} to ${toCurrency}`,
            );
            return amount;
        }

        return amount * parseFloat(exchangeRate.rate.toString());
    }

    private async calculateBudgetRemaining(
        workspaceIds: string[],
        month: number,
        year: number,
        currency: string,
        monthlyExpenses: number,
    ): Promise<number> {
        const budget = await this.prisma.budget.findFirst({
            where: {
                workspaceId: { in: workspaceIds },
                month,
                year,
                type: 'GENERAL',
            },
        });

        if (!budget) {
            return 0;
        }

        const budgetAmount = await this.convertCurrency(
            parseFloat(budget.amount.toString()),
            budget.currency,
            currency,
            new Date(),
        );

        return budgetAmount - monthlyExpenses;
    }
}
