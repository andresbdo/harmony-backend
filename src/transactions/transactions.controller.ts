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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { WorkspaceMemberGuard } from 'src/workspaces/workspace-member.guard';

@Controller('transactions')
@UseGuards(WorkspaceMemberGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateTransactionDto) {
        return this.transactionsService.create(req.workspaceId, dto);
    }

    @Get()
    findAll(@Request() req, @Query() filters: any) {
        return this.transactionsService.findAll(req.workspaceId, filters);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.transactionsService.findOne(id, req.workspaceId);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
        return this.transactionsService.update(id, req.workspaceId, dto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.transactionsService.remove(id, req.workspaceId);
    }
}
