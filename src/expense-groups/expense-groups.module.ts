import { Module } from '@nestjs/common';
import { ExpenseGroupsService } from './expense-groups.service';
import { ExpenseGroupsController } from './expense-groups.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
    imports: [PrismaModule, WorkspacesModule],
    controllers: [ExpenseGroupsController],
    providers: [ExpenseGroupsService],
    exports: [ExpenseGroupsService],
})
export class ExpenseGroupsModule { }
