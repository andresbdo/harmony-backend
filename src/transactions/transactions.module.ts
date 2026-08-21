import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { BudgetsModule } from 'src/budgets/budgets.module';

@Module({
    imports: [PrismaModule, WorkspacesModule, NotificationsModule, BudgetsModule],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule { }
