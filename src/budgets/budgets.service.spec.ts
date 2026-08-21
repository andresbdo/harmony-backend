import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/common/encryption/encryption.service';

const mockBudget = {
  id: 'budget-1',
  workspaceId: 'workspace-1',
  categoryId: 'category-1',
  month: 5,
  year: 2026,
  amount: 10000,
  currency: 'ARS',
};

const mockPrisma = {
  budget: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
  },
  saving: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEncryption = {
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  describe('checkExceeded', () => {
    const workspaceId = 'workspace-1';
    const categoryId = 'category-1';
    const month = 5;
    const year = 2026;

    it('returns exceeded: true when total spent (10100) exceeds budget (10000)', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 9500 },
        { amount: 600 },
      ]);

      const result = await service.checkExceeded(workspaceId, categoryId, month, year);

      expect(result.exceeded).toBe(true);
      expect(result.budget).toEqual(mockBudget);
      expect(result.totalSpent).toBeCloseTo(10100);
    });

    it('returns exceeded: false when total spent (9900) is within budget (10000)', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 9500 },
        { amount: 400 },
      ]);

      const result = await service.checkExceeded(workspaceId, categoryId, month, year);

      expect(result.exceeded).toBe(false);
      expect(result.budget).toEqual(mockBudget);
      expect(result.totalSpent).toBeCloseTo(9900);
    });

    it('returns exceeded: false with null budget when no budget found', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);

      const result = await service.checkExceeded(workspaceId, categoryId, month, year);

      expect(result.exceeded).toBe(false);
      expect(result.budget).toBeNull();
      expect(result.totalSpent).toBe(0);
      expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
    });

    it('queries budget with correct workspace, category, month, and year', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);

      await service.checkExceeded(workspaceId, categoryId, month, year);

      expect(mockPrisma.budget.findFirst).toHaveBeenCalledWith({
        where: { categoryId, month, year, workspaceId },
      });
    });

    it('queries only EXPENSE transactions within the correct month range', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(mockBudget);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.checkExceeded(workspaceId, categoryId, month, year);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          categoryId,
          workspaceId,
          type: 'EXPENSE',
          date: {
            gte: new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)),
            lt: new Date(Date.UTC(year, month, 1, 3, 0, 0)),
          },
        },
        select: { amount: true },
      });
    });
  });
});
