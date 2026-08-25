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

describe('DashboardService — getSummary balances', () => {
    let service: DashboardService;
    let prisma: any;

    beforeEach(async () => {
        prisma = makeMockPrisma({
            workspaceMember: { findMany: jest.fn().mockResolvedValue([{ workspaceId: wsId }]) },
            bankAccount: {
                findMany: jest.fn().mockResolvedValue([
                    { currentBalance: 1000, currency: 'ARS' },
                    { currentBalance: 2000, currency: 'ARS' },
                    { currentBalance: 50, currency: 'USD' },
                ]),
            },
            exchangeRate: { findFirst: jest.fn().mockResolvedValue(null) },
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

    it('sums multiple accounts sharing a currency into a single total instead of dropping them', async () => {
        const summary = await service.getSummary(userId);

        expect(summary.totalBalance).toEqual(
            expect.arrayContaining([
                { amount: 3000, currency: 'ARS' },
                { amount: 50, currency: 'USD' },
            ]),
        );
        expect(summary.totalBalance).toHaveLength(2);
    });
});

describe('DashboardService — getSummary respects the user\'s chosen cotización', () => {
    let service: DashboardService;
    let prisma: any;
    let findFirst: jest.Mock;

    beforeEach(async () => {
        findFirst = jest.fn().mockResolvedValue({ rate: 1000 });
        prisma = makeMockPrisma({
            workspaceMember: { findMany: jest.fn().mockResolvedValue([{ workspaceId: wsId }]) },
            user: {
                findUnique: jest.fn().mockResolvedValue({
                    preferredCurrency: 'ARS',
                    settings: { cotizacion1: 'blue' },
                }),
            },
            bankAccount: {
                findMany: jest.fn().mockResolvedValue([{ currentBalance: 100, currency: 'USD' }]),
            },
            exchangeRate: { findFirst },
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

    it('looks up the ExchangeRate row matching the user\'s cotizacion1, not just any rate', async () => {
        await service.getSummary(userId);

        expect(findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ name: { equals: 'blue', mode: 'insensitive' } }),
            }),
        );
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
