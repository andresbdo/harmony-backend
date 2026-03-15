import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto, CreateSavingDto, UpdateSavingDto } from './dto/budget.dto';
import { WorkspaceMemberGuard } from 'src/workspaces/workspace-member.guard';

@Controller('budgets')
@UseGuards(WorkspaceMemberGuard)
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) { }

    // Budgets
    @Post()
    createBudget(@Request() req, @Body() dto: CreateBudgetDto) {
        return this.budgetsService.createBudget(req.workspaceId, dto);
    }

    @Get()
    findAllBudgets(
        @Request() req,
        @Query('year') year: string,
        @Query('month') month?: string,
    ) {
        const currentYear = year ? parseInt(year) : new Date().getFullYear();
        const currentMonth = month ? parseInt(month) : undefined;
        return this.budgetsService.findAllBudgets(req.workspaceId, currentYear, currentMonth);
    }

    @Get(':id')
    findOneBudget(@Request() req, @Param('id') id: string) {
        return this.budgetsService.findOneBudget(id, req.workspaceId);
    }

    @Patch(':id')
    updateBudget(@Request() req, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
        return this.budgetsService.updateBudget(id, req.workspaceId, dto);
    }

    @Delete(':id')
    removeBudget(@Request() req, @Param('id') id: string) {
        return this.budgetsService.removeBudget(id, req.workspaceId);
    }

    // Savings
    @Post('savings')
    createSaving(@Request() req, @Body() dto: CreateSavingDto) {
        return this.budgetsService.createSaving(req.workspaceId, dto);
    }

    @Get('savings/all')
    findAllSavings(@Request() req) {
        return this.budgetsService.findAllSavings(req.workspaceId);
    }

    @Get('savings/:id')
    findOneSaving(@Request() req, @Param('id') id: string) {
        return this.budgetsService.findOneSaving(id, req.workspaceId);
    }

    @Patch('savings/:id')
    updateSaving(@Request() req, @Param('id') id: string, @Body() dto: UpdateSavingDto) {
        return this.budgetsService.updateSaving(id, req.workspaceId, dto);
    }

    @Delete('savings/:id')
    removeSaving(@Request() req, @Param('id') id: string) {
        return this.budgetsService.removeSaving(id, req.workspaceId);
    }
}
