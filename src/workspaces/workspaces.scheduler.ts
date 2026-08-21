import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';
import { getCurrentPeriodBounds } from './settlement.util';

@Injectable()
export class WorkspacesScheduler {
  constructor(
    private prisma: PrismaService,
    private workspacesService: WorkspacesService,
  ) {}

  @Cron('0 0 * * *')
  async autoCloseWorkspacePeriods() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        cycle: {
          in: ['WEEKLY', 'MONTHLY', 'YEARLY'],
        },
      },
    });

    for (const workspace of workspaces) {
      const periodBounds = getCurrentPeriodBounds(workspace, today);

      if (periodBounds === null) {
        continue;
      }

      const periodEndDate = new Date(periodBounds.periodEnd);
      periodEndDate.setHours(0, 0, 0, 0);

      if (periodEndDate.getTime() === today.getTime()) {
        await this.workspacesService.closeCurrentPeriod(workspace.id);
      }
    }
  }
}
