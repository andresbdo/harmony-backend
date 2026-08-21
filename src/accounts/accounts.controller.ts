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
import { AccountsService } from './accounts.service';
import {
    CreateBankAccountDto,
    UpdateBankAccountDto,
    CreateCardDto,
    UpdateCardDto,
} from './dto/account.dto';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard';

@Controller('accounts')
@UseGuards(WorkspaceMemberGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Post()
    createAccount(@Request() req, @Body() dto: CreateBankAccountDto) {
        return this.accountsService.createAccount(req.workspaceId, req.user.id, dto);
    }

    @Get()
    findAllAccounts(@Request() req) {
        return this.accountsService.findAllAccounts(req.workspaceId, req.user.id);
    }

    @Get(':id')
    findOneAccount(@Request() req, @Param('id') id: string) {
        return this.accountsService.findOneAccount(id, req.workspaceId);
    }

    @Patch(':id')
    updateAccount(@Request() req, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
        return this.accountsService.updateAccount(id, req.workspaceId, dto);
    }

    @Delete(':id')
    removeAccount(@Request() req, @Param('id') id: string) {
        return this.accountsService.removeAccount(id, req.workspaceId);
    }

    @Post('cards')
    createCard(@Request() req, @Body() dto: CreateCardDto) {
        return this.accountsService.createCard(req.workspaceId, dto);
    }

    @Get('cards/all')
    findAllCards(@Request() req) {
        return this.accountsService.findAllCards(req.workspaceId);
    }

    @Get('cards/:id')
    findOneCard(@Request() req, @Param('id') id: string) {
        return this.accountsService.findOneCard(id, req.workspaceId);
    }

    @Patch('cards/:id')
    updateCard(@Request() req, @Param('id') id: string, @Body() dto: UpdateCardDto) {
        return this.accountsService.updateCard(id, req.workspaceId, dto);
    }

    @Delete('cards/:id')
    removeCard(@Request() req, @Param('id') id: string) {
        return this.accountsService.removeCard(id, req.workspaceId);
    }
}
