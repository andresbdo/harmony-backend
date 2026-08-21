import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';

const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();

const userId = 'user-1';
const wsId = 'ws-1';

function makeMockPrisma(overrides: Record<string, any> = {}) {
    return {
        workspace: {
            findMany: jest.fn().mockResolvedValue([{ id: wsId }]),
            findFirst: jest.fn().mockResolvedValue({ id: wsId }),
        },
        subscription: { findMany: jest.fn().mockResolvedValue([]) },
        transaction: { findMany: jest.fn().mockResolvedValue([]) },
        bankAccount: { findMany: jest.fn().mockResolvedValue([]) },
        workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
        user: { findUnique: jest.fn().mockResolvedValue({ preferredCurrency: 'ARS' }) },
        budget: { findFirst: jest.fn().mockResolvedValue(null) },
        saving: { findMany: jest.fn().mockResolvedValue([]) },
        ...overrides,
    };
}

describe('DashboardService — getCalendarEvents (TASK-043)', () => {
    let service: DashboardService;
    let prisma: any;

    const sub15 = {
        id: 'sub-1',
        name: 'Netflix',
        nextBillingDate: new Date(year, month - 1, 15),
        amount: 1500,
        currency: 'ARS',
        frequency: 'MONTHLY',
        isActive: true,
    };

    const recurringTx = {
        id: 'tx-rec',
        description: null,
        amount: 500,
        currency: 'ARS',
        date: new Date(year, month - 1, 20),
        type: 'EXPENSE',
        isRecurrent: true,
        recurrenceRule: { frequency: 'MONTHLY', dayOfMonth: 20, interval: 1 },
        category: { name: 'Servicios' },
    };

    const cardWithDue10 = {
        id: 'acc-1',
        cards: [
            { id: 'card-1', name: 'Visa', dueDay: 10, statementCloseDay: 3 },
        ],
    };

    beforeEach(async () => {
        prisma = makeMockPrisma({
            subscription: { findMany: jest.fn().mockResolvedValue([sub15]) },
            transaction: { findMany: jest.fn().mockResolvedValue([recurringTx]) },
            bankAccount: { findMany: jest.fn().mockResolvedValue([cardWithDue10]) },
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                { provide: PrismaService, useValue: prisma },
                {
                    provide: EncryptionService,
                    useValue: { encrypt: (v: string) => v, decrypt: (v: string) => v },
                },
            ],
        }).compile();

        service = module.get<DashboardService>(DashboardService);
    });

    it('returns events of types SUBSCRIPTION, RECURRING, and CARD_DUE', async () => {
        const events = await service.getCalendarEvents(userId, null, month, year);

        const types = events.map(e => e.type);
        expect(types).toContain('SUBSCRIPTION');
        expect(types).toContain('RECURRING');
        expect(types).toContain('CARD_DUE');
    });

    it('excludes subscription and recurring events when workspaceId does not match', async () => {
        prisma.workspace.findMany.mockResolvedValue([]);
        prisma.subscription.findMany.mockResolvedValue([]);
        prisma.transaction.findMany.mockResolvedValue([]);

        const events = await service.getCalendarEvents(userId, 'other-ws', month, year);

        const types = events.map(e => e.type);
        expect(types).not.toContain('SUBSCRIPTION');
        expect(types).not.toContain('RECURRING');
    });
});

describe('DashboardService — saving goal pace calculation (TASK-042)', () => {
    it('on-track when total contributions match required monthly rate', () => {
        const targetAmount = 500000;
        const monthsRemaining = 10;
        const totalContributions = 50000;

        const requiredPerMonth = targetAmount / monthsRemaining;
        const currentPace = totalContributions;
        const onTrack = currentPace >= requiredPerMonth;

        expect(onTrack).toBe(true);
    });

    it('not on-track when contributions are below required monthly rate', () => {
        const targetAmount = 500000;
        const monthsRemaining = 10;
        const totalContributions = 30000;

        const requiredPerMonth = targetAmount / monthsRemaining;
        const currentPace = totalContributions;
        const onTrack = currentPace >= requiredPerMonth;

        expect(onTrack).toBe(false);
    });
});
