import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

const today = new Date();
today.setHours(0, 0, 0, 0);

const mockSubscription = {
    id: 'sub-1',
    name: 'Netflix',
    amount: { toNumber: () => 1500 },
    currency: 'ARS',
    frequency: 'MONTHLY',
    nextBillingDate: today,
    workspaceId: 'ws-1',
    isActive: true,
};

const mockCategory = { id: 'cat-sub', name: 'Subscriptions' };

const mockMember = { id: 'mem-1', userId: 'user-1', workspaceId: 'ws-1', responsibilityPercentage: 100 };

describe('SubscriptionsScheduler — processDueSubscriptions', () => {
    let scheduler: SubscriptionsScheduler;
    let prisma: any;
    let notifications: any;

    beforeEach(async () => {
        prisma = {
            subscription: {
                findMany: jest.fn().mockResolvedValue([mockSubscription]),
                update: jest.fn().mockResolvedValue({}),
            },
            category: {
                findFirst: jest.fn().mockResolvedValue(mockCategory),
            },
            transaction: {
                create: jest.fn().mockResolvedValue({ id: 'tx-new' }),
            },
            workspaceMember: {
                findMany: jest.fn().mockResolvedValue([mockMember]),
            },
        };

        notifications = {
            create: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionsScheduler,
                { provide: PrismaService, useValue: prisma },
                { provide: NotificationsService, useValue: notifications },
            ],
        }).compile();

        scheduler = module.get<SubscriptionsScheduler>(SubscriptionsScheduler);
    });

    it('creates a transaction for a due subscription', async () => {
        await scheduler.processDueSubscriptions();

        expect(prisma.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    subscriptionId: 'sub-1',
                    workspaceId: 'ws-1',
                    type: 'EXPENSE',
                }),
            }),
        );
    });

    it('advances nextBillingDate by one month for MONTHLY frequency', async () => {
        await scheduler.processDueSubscriptions();

        const expectedNext = new Date(today);
        expectedNext.setMonth(expectedNext.getMonth() + 1);

        expect(prisma.subscription.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'sub-1' },
                data: expect.objectContaining({
                    nextBillingDate: expectedNext,
                }),
            }),
        );
    });

    it('creates a SUBSCRIPTION_BILLED notification for each workspace member', async () => {
        await scheduler.processDueSubscriptions();

        expect(notifications.create).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({ type: 'SUBSCRIPTION_BILLED' }),
        );
    });
});
