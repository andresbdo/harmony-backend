import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let prisma: any;

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test WS',
    inviteToken: 'valid-token',
    members: [],
    isPersonal: false,
    ownerId: 'owner-1',
  };

  const mockUser = { id: 'user-2', email: 'user2@test.com', name: 'User Two' };

  beforeEach(async () => {
    const mockPrisma = {
      workspace: {
        findUnique: jest.fn().mockResolvedValue(mockWorkspace),
        findFirst: jest.fn().mockResolvedValue(mockWorkspace),
        update: jest.fn().mockResolvedValue(mockWorkspace),
      },
      workspaceMember: {
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      workspaceSettlement: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    prisma = module.get(PrismaService);
  });

  describe('joinByToken', () => {
    it('sets inviteToken to null after member joins', async () => {
      await service.joinByToken('valid-token', 'user-2');
      expect(prisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ inviteToken: null }) })
      );
    });

    it('does not create a new member when user is already in the workspace', async () => {
      const workspaceWithExistingMember = {
        ...mockWorkspace,
        members: [{ id: 'mem-1', userId: 'existing-user', workspaceId: 'ws-1' }],
      };
      prisma.workspace.findUnique.mockResolvedValueOnce(workspaceWithExistingMember);

      await service.joinByToken('valid-token', 'existing-user');

      expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
    });
  });

  describe('listSettlements', () => {
    it('TASK-035: returns both pending settlement from May and newly created June settlement', async () => {
      const maySettlement = {
        id: 'settle-may',
        workspaceId: 'ws-1',
        status: 'PENDING',
        periodStart: new Date(2026, 3, 21),
        periodEnd: new Date(2026, 4, 20),
        balances: [],
      };

      const juneSettlement = {
        id: 'settle-june',
        workspaceId: 'ws-1',
        status: 'PENDING',
        periodStart: new Date(2026, 4, 21),
        periodEnd: new Date(2026, 5, 20),
        balances: [],
      };

      prisma.workspaceSettlement.findMany.mockResolvedValueOnce([
        juneSettlement,
        maySettlement,
      ]);

      const result = await service.listSettlements('ws-1', 'owner-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('settle-june');
      expect(result[1].id).toBe('settle-may');
      expect(result[1].status).toBe('PENDING');
      expect(prisma.workspaceSettlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { periodStart: 'desc' } })
      );
    });
  });

  describe('updateSettlementStatus', () => {
    it('TASK-036: marks a pending settlement as settled without creating a transaction', async () => {
      const settlement = {
        id: 'settle-1',
        workspaceId: 'ws-1',
        status: 'SETTLED',
        periodStart: new Date(2026, 4, 21),
        periodEnd: new Date(2026, 5, 20),
        balances: [
          {
            fromMemberId: 'user-b',
            toMemberId: 'user-a',
            amount: 30000,
          },
        ],
      };

      prisma.workspaceSettlement.update.mockResolvedValueOnce(settlement);

      const result = await service.updateSettlementStatus(
        'ws-1',
        'settle-1',
        'owner-1',
        { status: 'SETTLED' }
      );

      expect(result.status).toBe('SETTLED');
      expect(prisma.workspaceSettlement.update).toHaveBeenCalledWith({
        where: { id: 'settle-1' },
        data: { status: 'SETTLED' },
      });
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('closeNow', () => {
    it('TASK-037: generates a pending settlement for indefinite workspace with accumulated expenses', async () => {
      const now = new Date(2026, 7, 4);
      const createdAt = new Date(2026, 0, 1);

      const indefiniteWorkspace = {
        id: 'ws-indefinite',
        name: 'Shared Home',
        cycle: 'INDEFINITE',
        createdAt,
        members: [
          { id: 'mem-a', responsibilityPercentage: 50 },
          { id: 'mem-b', responsibilityPercentage: 50 },
        ],
      };

      const transactions = [
        { amount: 60000, paidByMemberId: 'mem-a', date: new Date(2026, 2, 15) },
      ];

      prisma.workspace.findFirst.mockResolvedValueOnce(indefiniteWorkspace);
      prisma.workspace.findUnique.mockResolvedValueOnce(indefiniteWorkspace);
      prisma.transaction.findMany.mockResolvedValueOnce(transactions);
      prisma.workspaceSettlement.upsert.mockResolvedValueOnce({
        id: 'settle-new',
        workspaceId: 'ws-indefinite',
        status: 'PENDING',
        periodStart: createdAt,
        periodEnd: now,
      });

      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = await service.closeNow('ws-indefinite', 'mem-a');

      expect(prisma.workspaceSettlement.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.workspaceSettlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            periodStart: createdAt,
            status: 'PENDING',
          }),
        })
      );

      jest.useRealTimers();
    });
  });

  describe('update', () => {
    it('TASK-038: creates a settlement for in-progress monthly period when cycle changes to weekly', async () => {
      const now = new Date(2026, 0, 15);
      const monthlyWorkspace = {
        id: 'ws-1',
        name: 'Test WS',
        cycle: 'MONTHLY',
        cutoffDay: 20,
        weekStartDay: 0,
        yearStartMonth: 1,
        createdAt: new Date(2025, 0, 1),
        ownerId: 'owner-1',
        members: [
          { id: 'mem-1', responsibilityPercentage: 100 },
        ],
      };

      prisma.workspace.findFirst.mockResolvedValueOnce(monthlyWorkspace);
      prisma.workspace.findUnique.mockResolvedValueOnce(monthlyWorkspace);
      prisma.transaction.findMany.mockResolvedValueOnce([]);
      prisma.workspaceSettlement.upsert.mockResolvedValueOnce({});
      prisma.workspace.update.mockResolvedValueOnce({
        ...monthlyWorkspace,
        cycle: 'WEEKLY',
      });

      jest.useFakeTimers();
      jest.setSystemTime(now);

      await service.update('ws-1', 'owner-1', { cycle: 'WEEKLY' });

      expect(prisma.workspaceSettlement.upsert).toHaveBeenCalled();
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { cycle: 'WEEKLY' },
      });

      const upsertOrder = prisma.workspaceSettlement.upsert.mock.invocationCallOrder[0];
      const updateOrder = prisma.workspace.update.mock.invocationCallOrder[0];
      expect(upsertOrder).toBeLessThan(updateOrder);

      jest.useRealTimers();
    });

    it('TASK-039: throws ForbiddenException when non-owner attempts to change cycle', async () => {
      const sharedWorkspace = {
        id: 'ws-1',
        name: 'Test WS',
        cycle: 'MONTHLY',
        ownerId: 'owner-1',
        members: [
          { id: 'mem-1', userId: 'user-2', workspaceId: 'ws-1' },
        ],
      };

      prisma.workspace.findFirst.mockResolvedValueOnce(sharedWorkspace);

      const { ForbiddenException } = require('@nestjs/common');

      await expect(
        service.update('ws-1', 'user-2', { cycle: 'WEEKLY' })
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.workspace.update).not.toHaveBeenCalled();
    });
  });
});
