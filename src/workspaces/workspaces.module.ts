import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { WorkspacesScheduler } from './workspaces.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WorkspacesController],
    providers: [WorkspacesService, WorkspaceMemberGuard, WorkspacesScheduler],
    exports: [WorkspacesService, WorkspaceMemberGuard],
})
export class WorkspacesModule { }
