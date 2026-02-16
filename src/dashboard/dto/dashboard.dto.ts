export class DashboardSummaryDto {
    totalBalance: { amount: number; currency: string }[];
    budgetRemaining: number;
    moneyAvailable: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    incomeTrend: number; // percentage vs previous month
    expenseTrend: number; // percentage vs previous month
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
    payer: string; // name of who paid
    paymentMethod: string;
    workspace: string | null; // workspace name if applicable
}

export class DueEventDto {
    id: string;
    date: Date;
    description: string;
    amount: number | null;
    type: 'RECURRENT_TRANSACTION' | 'CARD_STATEMENT_CLOSE' | 'CARD_DUE';
    currency: string | null;
}

export class AccountWithCardsDto {
    id: string;
    name: string;
    type: string;
    currency: string;
    currentBalance: number;
    cards: {
        id: string;
        name: string;
        type: string;
        statementCloseDay: number;
        dueDay: number;
    }[];
}
