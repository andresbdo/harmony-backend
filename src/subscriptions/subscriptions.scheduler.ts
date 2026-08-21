import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionsScheduler {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron('0 0 * * *')
  async processDueSubscriptions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        nextBillingDate: { lte: today },
      },
    });

    for (const subscription of dueSubscriptions) {
      const subscriptionCategory = await this.prisma.category.findFirst({
        where: { name: 'Subscriptions', workspaceId: null },
      });

      const categoryId = subscriptionCategory?.id;
      if (!categoryId) continue;

      await this.prisma.transaction.create({
        data: {
          amount: subscription.amount,
          currency: subscription.currency,
          date: today,
          type: 'EXPENSE',
          paymentMethod: null,
          description: subscription.name,
          categoryId,
          workspaceId: subscription.workspaceId,
          subscriptionId: subscription.id,
        },
      });

      const nextBillingDate = new Date(subscription.nextBillingDate);
      const frequency = subscription.frequency.toUpperCase();

      if (frequency === 'MONTHLY') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (frequency === 'WEEKLY') {
        nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      } else if (frequency === 'YEARLY') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { nextBillingDate },
      });

      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: subscription.workspaceId, userId: { not: null } },
      });

      for (const member of members) {
        await this.notifications.create(member.userId as string, {
          type: 'SUBSCRIPTION_BILLED',
          message: `Subscription "${subscription.name}" was billed for ${subscription.amount} ${subscription.currency}.`,
          metadata: { subscriptionId: subscription.id },
        });
      }
    }
  }
}
