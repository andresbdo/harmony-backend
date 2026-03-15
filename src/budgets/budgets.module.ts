import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';

@Module({
    imports: [PrismaModule, WorkspacesModule],
    controllers: [BudgetsController],
    providers: [BudgetsService],
    exports: [BudgetsService],
})
export class BudgetsModule { }
