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
import { AssignPaymentMethodDto, CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { WorkspaceMemberGuard } from 'src/workspaces/workspace-member.guard';

@Controller('transactions')
@UseGuards(WorkspaceMemberGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateTransactionDto) {
        return this.transactionsService.create(req.workspaceId, dto, req.user.id);
    }

    @Get('pending-payments')
    getPendingPayments(@Request() req) {
        return this.transactionsService.getPendingPayments(req.user.id);
    }

    @Get()
    findAll(@Request() req, @Query() filters: any) {
        return this.transactionsService.findAll(req.workspaceId, filters, req.user.id);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.transactionsService.findOne(id, req.workspaceId, req.user.id);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
        return this.transactionsService.update(id, req.workspaceId, dto);
    }

    @Patch(':id/assign-payment')
    assignPaymentMethod(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: AssignPaymentMethodDto,
    ) {
        return this.transactionsService.assignPaymentMethod(id, req.user.id, dto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.transactionsService.remove(id, req.workspaceId);
    }
}
