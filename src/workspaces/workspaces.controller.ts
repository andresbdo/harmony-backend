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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddMemberDto, UpdateMemberDto, UpdateMemberSalaryDto } from './dto/workspace.dto';
import { UpdateSettlementStatusDto } from './dto/settlement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) { }

    @Post()
    create(@Request() req, @Body() createWorkspaceDto: CreateWorkspaceDto) {
        return this.workspacesService.create(req.user.id, createWorkspaceDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.workspacesService.findAll(req.user.id);
    }

    @Get('join-preview/:token')
    @Public()
    getJoinPreview(@Param('token') token: string) {
        return this.workspacesService.getJoinPreview(token);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.workspacesService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
        return this.workspacesService.update(id, req.user.id, dto);
    }

    @Post('join/:token')
    joinByToken(@Param('token') token: string, @Request() req) {
        return this.workspacesService.joinByToken(token, req.user.id);
    }

    @Post(':id/members')
    addMember(@Request() req, @Param('id') id: string, @Body() dto: AddMemberDto) {
        return this.workspacesService.addMember(id, req.user.id, dto);
    }

    @Get(':id/closing')
    getClosing(@Request() req, @Param('id') id: string) {
        return this.workspacesService.calculateClosing(id, req.user.id);
    }

    @Patch(':id/members/:memberId')
    updateMember(@Request() req, @Param('id') id: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberDto) {
        return this.workspacesService.updateMember(id, memberId, req.user.id, dto);
    }

    @Patch(':id/members/:memberId/salary')
    updateMemberSalary(@Request() req, @Param('id') id: string, @Param('memberId') memberId: string, @Body() dto: UpdateMemberSalaryDto) {
        return this.workspacesService.updateMemberSalary(id, memberId, req.user.id, dto);
    }

    @Delete(':id/members/:memberId')
    removeMember(@Request() req, @Param('id') id: string, @Param('memberId') memberId: string) {
        return this.workspacesService.removeMember(id, memberId, req.user.id);
    }

    @Get(':id/settlements')
    listSettlements(@Request() req, @Param('id') id: string) {
        return this.workspacesService.listSettlements(id, req.user.id);
    }

    @Post(':id/settlements/close')
    closeNow(@Request() req, @Param('id') id: string) {
        return this.workspacesService.closeNow(id, req.user.id);
    }

    @Patch(':id/settlements/:settlementId')
    updateSettlementStatus(@Request() req, @Param('id') id: string, @Param('settlementId') settlementId: string, @Body() dto: UpdateSettlementStatusDto) {
        return this.workspacesService.updateSettlementStatus(id, settlementId, req.user.id, dto);
    }

    @Post(':id/regenerate-invite')
    regenerateInviteToken(@Request() req, @Param('id') id: string) {
        return this.workspacesService.regenerateInviteToken(id, req.user.id);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.workspacesService.remove(id, req.user.id);
    }
}
