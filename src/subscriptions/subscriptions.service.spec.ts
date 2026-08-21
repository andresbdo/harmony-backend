import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

const today = new Date();
today.setHours(0, 0, 0, 0);

const mockCategory = { id: 'cat-sub', name: 'Subscriptions' };

describe('SubscriptionsScheduler — shared workspace billing', () => {
    let scheduler: SubscriptionsScheduler;
    let prisma: any;
    let notifications: any;

    const subscriptionAmount = 10000;
    const mockSubscription = {
        id: 'sub-shared',
        name: 'Spotify Familiar',
        amount: { toNumber: () => subscriptionAmount },
        currency: 'ARS',
        frequency: 'MONTHLY',
        nextBillingDate: today,
        workspaceId: 'ws-shared',
        isActive: true,
    };

    const member1 = { id: 'mem-1', userId: 'user-1', workspaceId: 'ws-shared', responsibilityPercentage: 50 };
    const member2 = { id: 'mem-2', userId: 'user-2', workspaceId: 'ws-shared', responsibilityPercentage: 50 };

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
                create: jest.fn().mockResolvedValue({ id: 'tx-shared' }),
            },
            workspaceMember: {
                findMany: jest.fn().mockResolvedValue([member1, member2]),
            },
        };

        notifications = { create: jest.fn().mockResolvedValue({}) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionsScheduler,
                { provide: PrismaService, useValue: prisma },
                { provide: NotificationsService, useValue: notifications },
            ],
        }).compile();

        scheduler = module.get<SubscriptionsScheduler>(SubscriptionsScheduler);
    });

    it('stores full subscription amount in transaction, not the proportional share', async () => {
        await scheduler.processDueSubscriptions();

        expect(prisma.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    amount: mockSubscription.amount,
                }),
            }),
        );
    });

    it('sends a notification to each workspace member', async () => {
        await scheduler.processDueSubscriptions();

        expect(notifications.create).toHaveBeenCalledTimes(2);
        expect(notifications.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'SUBSCRIPTION_BILLED' }));
        expect(notifications.create).toHaveBeenCalledWith('user-2', expect.objectContaining({ type: 'SUBSCRIPTION_BILLED' }));
    });
});
