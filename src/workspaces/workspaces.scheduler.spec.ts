import { Test, TestingModule } from '@nestjs/testing';
import { WorkspacesScheduler } from './workspaces.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesScheduler', () => {
  let scheduler: WorkspacesScheduler;
  let prisma: any;
  let workspacesService: any;

  const fixtureWorkspace = {
    id: 'ws-monthly-1',
    name: 'Shared Workspace',
    cycle: 'MONTHLY' as const,
    cutoffDay: 20,
    weekStartDay: 1,
    yearStartMonth: 1,
  };

  beforeEach(async () => {
    prisma = {
      workspace: {
        findMany: jest.fn(),
      },
    };

    workspacesService = {
      closeCurrentPeriod: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkspacesService, useValue: workspacesService },
      ],
    }).compile();

    scheduler = module.get<WorkspacesScheduler>(WorkspacesScheduler);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('autoCloseWorkspacePeriods', () => {
    it('GIVEN a shared workspace with cycle=MONTHLY and cutoffDay=20, WHEN the cron runs on day 20, THEN closeCurrentPeriod is called', async () => {
      const dateOnCutoffDay = new Date(2026, 0, 20); // January 20, 2026
      jest.setSystemTime(dateOnCutoffDay);

      prisma.workspace.findMany.mockResolvedValue([fixtureWorkspace]);

      await scheduler.autoCloseWorkspacePeriods();

      expect(workspacesService.closeCurrentPeriod).toHaveBeenCalledWith('ws-monthly-1');
      expect(workspacesService.closeCurrentPeriod).toHaveBeenCalledTimes(1);
    });

    it('GIVEN a shared workspace with cycle=MONTHLY and cutoffDay=20, WHEN the cron runs on a day that is NOT 20, THEN closeCurrentPeriod is NOT called', async () => {
      const dateNotOnCutoffDay = new Date(2026, 0, 19); // January 19, 2026
      jest.setSystemTime(dateNotOnCutoffDay);

      prisma.workspace.findMany.mockResolvedValue([fixtureWorkspace]);

      await scheduler.autoCloseWorkspacePeriods();

      expect(workspacesService.closeCurrentPeriod).not.toHaveBeenCalled();
    });
  });
});
