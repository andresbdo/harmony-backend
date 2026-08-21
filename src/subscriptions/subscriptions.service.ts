import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!member) throw new ForbiddenException('Access denied');
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    await this.assertMembership(userId, dto.workspaceId);
    return this.prisma.subscription.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        frequency: dto.frequency,
        nextBillingDate: new Date(dto.nextBillingDate),
        workspaceId: dto.workspaceId,
      },
    });
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    return this.prisma.subscription.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertMembership(userId, subscription.workspaceId);
    return subscription;
  }

  async update(id: string, userId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertMembership(userId, subscription.workspaceId);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.nextBillingDate !== undefined && { nextBillingDate: new Date(dto.nextBillingDate) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deactivate(id: string, userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertMembership(userId, subscription.workspaceId);
    return this.prisma.subscription.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
