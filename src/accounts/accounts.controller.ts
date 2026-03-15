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
import { WorkspaceMemberGuard } from 'src/workspaces/workspace-member.guard';

@Controller('accounts')
@UseGuards(WorkspaceMemberGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    // Bank Accounts
    @Post()
    createAccount(@Request() req, @Body() dto: CreateBankAccountDto) {
        return this.accountsService.createAccount(req.user.id, dto);
    }

    @Get()
    findAllAccounts(@Request() req) {
        return this.accountsService.findAllAccounts(req.user.id);
    }

    @Get(':id')
    findOneAccount(@Request() req, @Param('id') id: string) {
        return this.accountsService.findOneAccount(id, req.user.id);
    }

    @Patch(':id')
    updateAccount(@Request() req, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
        return this.accountsService.updateAccount(id, req.user.id, dto);
    }

    @Delete(':id')
    removeAccount(@Request() req, @Param('id') id: string) {
        return this.accountsService.removeAccount(id, req.user.id);
    }

    // Cards
    @Post('cards')
    createCard(@Request() req, @Body() dto: CreateCardDto) {
        return this.accountsService.createCard(req.user.id, dto);
    }

    @Get('cards/all')
    findAllCards(@Request() req) {
        return this.accountsService.findAllCards(req.user.id);
    }

    @Get('cards/:id')
    findOneCard(@Request() req, @Param('id') id: string) {
        return this.accountsService.findOneCard(id, req.user.id);
    }

    @Patch('cards/:id')
    updateCard(@Request() req, @Param('id') id: string, @Body() dto: UpdateCardDto) {
        return this.accountsService.updateCard(id, req.user.id, dto);
    }

    @Delete('cards/:id')
    removeCard(@Request() req, @Param('id') id: string) {
        return this.accountsService.removeCard(id, req.user.id);
    }
}
