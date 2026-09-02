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
} from '@nestjs/common';
import { ExpenseGroupsService } from './expense-groups.service';
import { CreateExpenseGroupDto, UpdateExpenseGroupDto, AssignCategoriesDto } from './dto/expense-group.dto';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard';

@Controller('expense-groups')
@UseGuards(WorkspaceMemberGuard)
export class ExpenseGroupsController {
    constructor(private readonly expenseGroupsService: ExpenseGroupsService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateExpenseGroupDto) {
        return this.expenseGroupsService.create(req.workspaceId, dto);
    }

    @Get()
    findAll(@Request() req) {
        return this.expenseGroupsService.findAll(req.workspaceId);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.expenseGroupsService.findOne(id, req.workspaceId);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateExpenseGroupDto) {
        return this.expenseGroupsService.update(id, req.workspaceId, dto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.expenseGroupsService.remove(id, req.workspaceId);
    }

    @Patch(':id/categories')
    assignCategories(@Request() req, @Param('id') id: string, @Body() dto: AssignCategoriesDto) {
        return this.expenseGroupsService.assignCategories(id, req.workspaceId, req.user.id, dto);
    }

    @Delete(':id/categories/:categoryId')
    unassignCategory(@Request() req, @Param('id') id: string, @Param('categoryId') categoryId: string) {
        return this.expenseGroupsService.unassignCategory(id, req.workspaceId, categoryId);
    }

    @Get(':id/transactions')
    getPeriodTransactions(@Request() req, @Param('id') id: string) {
        return this.expenseGroupsService.getPeriodTransactions(id, req.workspaceId);
    }

    @Patch(':id/reconcile')
    reconcile(@Request() req, @Param('id') id: string) {
        return this.expenseGroupsService.reconcile(id, req.workspaceId);
    }
}
