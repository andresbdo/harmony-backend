export class DashboardSummaryDto {
    totalBalance: { amount: number; currency: string }[];
    budgetRemaining: number;
    moneyAvailable: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    incomeTrend: number;
    expenseTrend: number;
}

export class RecentTransactionDto {
    id: string;
    amount: number;
    currency: string;
    date: Date;
    description: string | null;
    type: string;
    category: {
        name: string;
        color: string;
        icon: string;
    };
    payer: string;
    paymentMethod: string | null;
    workspace: { name: string; color: string } | null;
}

export class DueEventDto {
    id: string;
    date: Date;
    description: string;
    amount: number | null;
    type: 'RECURRENT_TRANSACTION' | 'CARD_STATEMENT_CLOSE' | 'CARD_DUE' | 'SUBSCRIPTION';
    currency: string | null;
}

export class AccountWithCardsDto {
    id: string;
    name: string;
    type: string;
    currency: string;
    currentBalance: number;
    balanceVisible: boolean;
    cards: {
        id: string;
        name: string;
        type: string;
        statementCloseDay: number;
        dueDay: number;
    }[];
}

export class CalendarEvent {
    date: string;
    type: string;
    title: string;
    color: string;
    amount?: number;
    currency?: string;
}
