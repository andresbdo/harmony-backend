import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BudgetsService } from '../budgets/budgets.service';

const makeTx = (overrides = {}) => ({
    id: 'tx-1',
    amount: 100,
    currency: 'ARS',
    date: new Date(),
    description: null,
    type: 'EXPENSE',
    categoryId: 'cat-1',
    workspaceId: 'ws-1',
    paidByMemberId: 'member-1',
    paymentMethod: 'BANK_ACCOUNT',
    bankAccountId: 'acc-123',
    cardId: null,
    savingGoalId: null,
    isRecurrent: false,
    recurrenceRule: null,
    category: null,
    workspace: null,
    bankAccount: null,
    card: null,
    paidByMember: { id: 'member-1', userId: 'user-A' },
    ...overrides,
});

describe('TransactionsService — stripPaymentDetails', () => {
    let service: TransactionsService;
    let prisma: { transaction: { findFirst: jest.Mock } };

    beforeEach(async () => {
        prisma = {
            transaction: {
                findFirst: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: PrismaService, useValue: prisma },
                {
                    provide: EncryptionService,
                    useValue: {
                        encrypt: (v: string) => v,
                        decrypt: (v: string) => v,
                    },
                },
                {
                    provide: NotificationsService,
                    useValue: { create: jest.fn() },
                },
                {
                    provide: BudgetsService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
    });

    it('strips bankAccountId and cardId when requesting user is not the payer', async () => {
        const tx = makeTx({ bankAccountId: 'acc-123', cardId: 'card-999' });
        prisma.transaction.findFirst.mockResolvedValue(tx);

        const result = await service.findOne('tx-1', 'ws-1', 'user-B');

        expect(result.bankAccountId).toBeNull();
        expect(result.cardId).toBeNull();
    });

    it('preserves bankAccountId and cardId when requesting user is the payer', async () => {
        const tx = makeTx({ bankAccountId: 'acc-123', cardId: 'card-999' });
        prisma.transaction.findFirst.mockResolvedValue(tx);

        const result = await service.findOne('tx-1', 'ws-1', 'user-A');

        expect(result.bankAccountId).toBe('acc-123');
        expect(result.cardId).toBe('card-999');
    });

    it('throws NotFoundException when transaction does not exist', async () => {
        prisma.transaction.findFirst.mockResolvedValue(null);

        await expect(service.findOne('tx-missing', 'ws-1', 'user-A')).rejects.toThrow(NotFoundException);
    });
});

describe('TransactionsService — getPendingPayments', () => {
    let service: TransactionsService;
    let prisma: { transaction: { findMany: jest.Mock } };

    const userId = 'user-A';

    const makePendingTx = (id: string) => ({
        ...makeTx({
            id,
            paymentMethod: null,
            bankAccountId: null,
            cardId: null,
            paidByMember: { id: 'member-1', userId },
            workspace: { id: 'ws-1', name: 'Hogar' },
            category: { id: 'cat-1', name: 'Comida' },
        }),
    });

    beforeEach(async () => {
        prisma = {
            transaction: {
                findMany: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: PrismaService, useValue: prisma },
                {
                    provide: EncryptionService,
                    useValue: {
                        encrypt: (v: string) => v,
                        decrypt: (v: string) => v,
                    },
                },
                {
                    provide: NotificationsService,
                    useValue: { create: jest.fn() },
                },
                {
                    provide: BudgetsService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
    });

    it('returns only transactions where paidByMember.userId matches and paymentMethod is null', async () => {
        const pending = [makePendingTx('tx-pending-1'), makePendingTx('tx-pending-2')];
        prisma.transaction.findMany.mockResolvedValue(pending);

        const result = await service.getPendingPayments(userId);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    paymentMethod: null,
                }),
            }),
        );
        expect(result).toHaveLength(2);
    });
});

describe('TransactionsService — create with subscriptionId (TASK-040)', () => {
    let service: TransactionsService;
    let prisma: { transaction: { create: jest.Mock; findMany: jest.Mock }; bankAccount: { findUnique: jest.Mock }; category: { findUnique: jest.Mock } };
    let budgetsService: { checkExceeded: jest.Mock };

    beforeEach(async () => {
        prisma = {
            transaction: {
                create: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
            },
            bankAccount: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
            category: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
        };
        budgetsService = { checkExceeded: jest.fn().mockResolvedValue({ exceeded: false, budget: null, totalSpent: 0 }) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: PrismaService, useValue: prisma },
                { provide: EncryptionService, useValue: { encrypt: (v: string) => v, decrypt: (v: string) => v } },
                { provide: NotificationsService, useValue: { create: jest.fn() } },
                { provide: BudgetsService, useValue: budgetsService },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
    });

    it('persists subscriptionId when creating a recurrent transaction linked to a subscription', async () => {
        const createdTx = makeTx({ id: 'tx-new', subscriptionId: 'sub-123', isRecurrent: true, description: null });
        prisma.transaction.create.mockResolvedValue(createdTx);

        const dto: any = {
            amount: 1500,
            currency: 'ARS',
            date: new Date().toISOString(),
            type: 'EXPENSE',
            categoryId: 'cat-1',
            isRecurrent: true,
            subscriptionId: 'sub-123',
        };

        await service.create('ws-1', dto, 'user-A');

        expect(prisma.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    isRecurrent: true,
                }),
            }),
        );
        expect(createdTx.subscriptionId).toBe('sub-123');
    });
});

describe('TransactionsService — create with SAVING type (TASK-041)', () => {
    let service: TransactionsService;
    let prisma: { transaction: { create: jest.Mock; findMany: jest.Mock }; bankAccount: { findUnique: jest.Mock } };
    let budgetsService: { checkExceeded: jest.Mock };

    beforeEach(async () => {
        prisma = {
            transaction: {
                create: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
            },
            bankAccount: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
        };
        budgetsService = { checkExceeded: jest.fn().mockResolvedValue({ exceeded: false, budget: null, totalSpent: 0 }) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: PrismaService, useValue: prisma },
                { provide: EncryptionService, useValue: { encrypt: (v: string) => v, decrypt: (v: string) => v } },
                { provide: NotificationsService, useValue: { create: jest.fn() } },
                { provide: BudgetsService, useValue: budgetsService },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
    });

    it('persists savingGoalId and type SAVING when creating a saving contribution', async () => {
        const createdTx = makeTx({ id: 'tx-saving', type: 'SAVING', savingGoalId: 'saving-1', amount: 50000, description: null });
        prisma.transaction.create.mockResolvedValue(createdTx);

        const dto: any = {
            amount: 50000,
            currency: 'ARS',
            date: new Date().toISOString(),
            type: 'SAVING',
            categoryId: 'cat-1',
            savingGoalId: 'saving-1',
        };

        await service.create('ws-1', dto, 'user-A');

        expect(prisma.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    savingGoalId: 'saving-1',
                    type: 'SAVING',
                }),
            }),
        );
    });
});
