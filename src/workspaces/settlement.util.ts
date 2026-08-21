import { WorkspaceCycle } from '@prisma/client';

interface WorkspaceConfig {
  cycle: WorkspaceCycle;
  cutoffDay: number;
  weekStartDay: number;
  yearStartMonth: number;
}

interface PeriodBounds {
  periodStart: Date;
  periodEnd: Date;
}

export function getCurrentPeriodBounds(
  workspace: WorkspaceConfig,
  now: Date,
): PeriodBounds | null {
  if (workspace.cycle === 'INDEFINITE') {
    return null;
  }

  if (workspace.cycle === 'MONTHLY') {
    return getMonthlyPeriodBounds(workspace.cutoffDay, now);
  }

  if (workspace.cycle === 'WEEKLY') {
    return getWeeklyPeriodBounds(workspace.weekStartDay, now);
  }

  if (workspace.cycle === 'YEARLY') {
    return getYearlyPeriodBounds(workspace.yearStartMonth, now);
  }

  // Exhaustiveness check (should not reach here if all cycles are handled)
  const _exhaustive: never = workspace.cycle;
  return _exhaustive;
}

function getMonthlyPeriodBounds(cutoffDay: number, now: Date): PeriodBounds {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Determine which month's cutoff ends the current settlement period
  let periodEndMonth: number;
  let periodEndYear: number;

  if (currentDay > cutoffDay) {
    // We're past the cutoff of the current month, so period ends on next month's cutoff
    if (currentMonth === 11) {
      periodEndMonth = 0;
      periodEndYear = currentYear + 1;
    } else {
      periodEndMonth = currentMonth + 1;
      periodEndYear = currentYear;
    }
  } else {
    // We're on or before the cutoff, so period ends on current month's cutoff
    periodEndMonth = currentMonth;
    periodEndYear = currentYear;
  }

  const periodEnd = new Date(periodEndYear, periodEndMonth, cutoffDay);
  periodEnd.setHours(23, 59, 59, 999);

  // Period starts the day after the previous cutoff
  let previousCutoffMonth: number;
  let previousCutoffYear: number;

  if (periodEndMonth === 0) {
    previousCutoffMonth = 11;
    previousCutoffYear = periodEndYear - 1;
  } else {
    previousCutoffMonth = periodEndMonth - 1;
    previousCutoffYear = periodEndYear;
  }

  const periodStart = new Date(
    previousCutoffYear,
    previousCutoffMonth,
    cutoffDay,
  );
  periodStart.setDate(periodStart.getDate() + 1);
  periodStart.setHours(0, 0, 0, 0);

  return { periodStart, periodEnd };
}

function getWeeklyPeriodBounds(
  weekStartDay: number,
  now: Date,
): PeriodBounds {
  const currentDayOfWeek = now.getDay();
  const daysToSubtract = (currentDayOfWeek - weekStartDay + 7) % 7;

  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - daysToSubtract);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 6);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

function getYearlyPeriodBounds(
  yearStartMonth: number,
  now: Date,
): PeriodBounds {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, convert to 1-12

  // Determine which year's cycle we're in
  let cycleYear: number;
  if (currentMonth >= yearStartMonth) {
    // We're in or after the start month of the current year's cycle
    cycleYear = currentYear;
  } else {
    // We're before the start month, so we're in the previous year's cycle
    cycleYear = currentYear - 1;
  }

  // Period starts on yearStartMonth/1 of the cycle year
  const periodStart = new Date(cycleYear, yearStartMonth - 1, 1);

  // Period ends on the day before yearStartMonth/1 of the next year
  const periodEnd = new Date(cycleYear + 1, yearStartMonth - 1, 1);
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

interface Member {
  id: string;
  responsibilityPercentage: number;
}

interface Transaction {
  amount: number;
  paidByMemberId: string | null;
}

export interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export function computePairwiseBalances(
  members: Member[],
  transactions: Transaction[],
): Settlement[] {
  const EPSILON = 0.01;

  const totalSpent = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0,
  );

  const balances: Map<string, number> = new Map();

  for (const member of members) {
    const percentage = Number(member.responsibilityPercentage);
    const share = totalSpent * (percentage / 100);
    const actualPaid = transactions
      .filter((tx) => tx.paidByMemberId === member.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const net = actualPaid - share;
    if (Math.abs(net) >= EPSILON) {
      balances.set(member.id, net);
    }
  }

  const settlements: Settlement[] = [];
  const debtors: Array<{ id: string; amount: number }> = [];
  const creditors: Array<{ id: string; amount: number }> = [];

  for (const [memberId, net] of balances) {
    if (net < -EPSILON) {
      debtors.push({ id: memberId, amount: Math.abs(net) });
    } else if (net > EPSILON) {
      creditors.push({ id: memberId, amount: net });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (
    debtorIdx < debtors.length &&
    creditorIdx < creditors.length
  ) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      fromMemberId: debtor.id,
      toMemberId: creditor.id,
      amount: settlementAmount,
    });

    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;

    if (debtor.amount < EPSILON) {
      debtorIdx++;
    }
    if (creditor.amount < EPSILON) {
      creditorIdx++;
    }
  }

  return settlements;
}
