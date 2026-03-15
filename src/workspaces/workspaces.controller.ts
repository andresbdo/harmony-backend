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
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddMemberDto, UpdateMemberDto } from './dto/workspace.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.workspacesService.findOne(id, req.user.id);
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

    @Delete(':id/members/:memberId')
    removeMember(@Request() req, @Param('id') id: string, @Param('memberId') memberId: string) {
        return this.workspacesService.removeMember(id, memberId, req.user.id);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.workspacesService.remove(id, req.user.id);
    }
}
