import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
    DashboardSummaryDto,
    RecentTransactionDto,
    DueEventDto,
    AccountWithCardsDto,
    CalendarEvent,
} from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('summary')
    async getSummary(
        @Request() req,
        @Query('workspaceId') workspaceId?: string,
    ): Promise<DashboardSummaryDto> {
        return this.dashboardService.getSummary(req.user.id, workspaceId);
    }

    @Get('recent-transactions')
    async getRecentTransactions(
        @Request() req,
        @Query('limit') limit?: string,
    ): Promise<RecentTransactionDto[]> {
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.dashboardService.getRecentTransactions(req.user.id, parsedLimit);
    }

    @Get('due-events')
    async getDueEvents(
        @Request() req,
        @Query('from') from: string,
        @Query('to') to: string,
    ): Promise<DueEventDto[]> {
        const fromDate = from ? new Date(from) : new Date();
        const toDate = to
            ? new Date(to)
            : new Date(new Date().setMonth(new Date().getMonth() + 1));

        return this.dashboardService.getDueEvents(req.user.id, fromDate, toDate);
    }

    @Get('accounts')
    async getAccounts(@Request() req): Promise<AccountWithCardsDto[]> {
        return this.dashboardService.getAccounts(req.user.id);
    }

    @Get('calendar')
    async getCalendarEvents(
        @Request() req,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('workspaceId') workspaceId?: string,
    ): Promise<CalendarEvent[]> {
        const now = new Date();
        const parsedMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
        const parsedYear = year ? parseInt(year, 10) : now.getFullYear();
        const parsedWorkspaceId = workspaceId || null;

        return this.dashboardService.getCalendarEvents(
            req.user.id,
            parsedWorkspaceId,
            parsedMonth,
            parsedYear,
        );
    }
}
