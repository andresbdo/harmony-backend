import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WorkspacesController],
    providers: [WorkspacesService, WorkspaceMemberGuard],
    exports: [WorkspacesService, WorkspaceMemberGuard],
})
export class WorkspacesModule { }
