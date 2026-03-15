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
    create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
        return this.transactionsService.create(req.user.id, createTransactionDto);
    }

    @Get()
    findAll(
        @Request() req,
        @Query('workspaceId') workspaceId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('type') type?: string,
    ) {
        return this.transactionsService.findAll(req.user.id, {
            workspaceId,
            categoryId,
            type,
        });
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.transactionsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(
        @Request() req,
        @Param('id') id: string,
        @Body() updateTransactionDto: UpdateTransactionDto,
    ) {
        return this.transactionsService.update(id, req.user.id, updateTransactionDto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.transactionsService.remove(id, req.user.id);
    }
}
