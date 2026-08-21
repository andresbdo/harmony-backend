import { computePairwiseBalances, getCurrentPeriodBounds } from './settlement.util';

describe('settlement.util', () => {
  describe('computePairwiseBalances', () => {
    it('GIVEN dos miembros al 50% cada uno, WHEN el total de gastos fue $60.000 pagados por A, THEN B le debe $30.000 a A', () => {
      const members = [
        { id: 'user-a', responsibilityPercentage: 50 },
        { id: 'user-b', responsibilityPercentage: 50 },
      ];

      const transactions = [{ amount: 60000, paidByMemberId: 'user-a' }];

      const settlements = computePairwiseBalances(members, transactions);

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        fromMemberId: 'user-b',
        toMemberId: 'user-a',
        amount: 30000,
      });
    });
  });

  describe('getCurrentPeriodBounds', () => {
    it('GIVEN MONTHLY cycle con cutoffDay=20, WHEN la fecha es antes del cutoff (día 10), THEN el período actual termina el día 20 del mes actual', () => {
      const workspace = {
        cycle: 'MONTHLY' as const,
        cutoffDay: 20,
        weekStartDay: 0,
        yearStartMonth: 1,
      };

      const now = new Date(2026, 0, 10); // January 10, 2026

      const bounds = getCurrentPeriodBounds(workspace, now);

      expect(bounds).not.toBeNull();
      expect(bounds!.periodEnd.getDate()).toBe(20);
      expect(bounds!.periodEnd.getMonth()).toBe(0);
      expect(bounds!.periodEnd.getFullYear()).toBe(2026);
    });

    it('GIVEN MONTHLY cycle con cutoffDay=20, WHEN la fecha es después del cutoff (día 25), THEN el período actual termina el día 20 del mes siguiente', () => {
      const workspace = {
        cycle: 'MONTHLY' as const,
        cutoffDay: 20,
        weekStartDay: 0,
        yearStartMonth: 1,
      };

      const now = new Date(2026, 0, 25); // January 25, 2026

      const bounds = getCurrentPeriodBounds(workspace, now);

      expect(bounds).not.toBeNull();
      expect(bounds!.periodEnd.getDate()).toBe(20);
      expect(bounds!.periodEnd.getMonth()).toBe(1);
      expect(bounds!.periodEnd.getFullYear()).toBe(2026);
    });
  });
});
