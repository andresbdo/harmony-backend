import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRatesService } from './exchange-rates.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  exchangeRate: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
};

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
  });

  describe('getLatest', () => {
    describe('GIVEN today rates are not in DB AND dolarapi fetch fails', () => {
      const cachedFallbackRecords = [
        {
          id: 1,
          fromCurrency: 'USD',
          toCurrency: 'ARS',
          rate: 1000,
          name: 'Oficial',
          compra: 950,
          date: new Date('2026-05-17'),
        },
        {
          id: 2,
          fromCurrency: 'USD',
          toCurrency: 'ARS',
          rate: 1200,
          name: 'Blue',
          compra: 1150,
          date: new Date('2026-05-17'),
        },
      ];

      beforeEach(() => {
        mockPrisma.exchangeRate.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(cachedFallbackRecords);

        jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('WHEN getLatest() is called THEN returns cached rates from previous date without throwing', async () => {
        const result = await service.getLatest();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Oficial', compra: 950, venta: 1000 });
        expect(result[1]).toEqual({ name: 'Blue', compra: 1150, venta: 1200 });
      });

      it('WHEN getLatest() is called THEN first queries today range then fallback without date filter', async () => {
        await service.getLatest();

        expect(mockPrisma.exchangeRate.findMany).toHaveBeenCalledTimes(2);

        const firstCall = mockPrisma.exchangeRate.findMany.mock.calls[0][0];
        expect(firstCall.where.date).toBeDefined();

        const secondCall = mockPrisma.exchangeRate.findMany.mock.calls[1][0];
        expect(secondCall.orderBy).toEqual({ date: 'desc' });
        expect(secondCall.take).toBe(20);
        expect(secondCall.where.date).toBeUndefined();
      });
    });
  });
});
