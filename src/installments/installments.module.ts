import { Module } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { InstallmentsController } from './installments.controller';
import { InstallmentsScheduler } from './installments.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
    imports: [PrismaModule, TransactionsModule, NotificationsModule, BudgetsModule],
    controllers: [InstallmentsController],
    providers: [InstallmentsService, InstallmentsScheduler],
    exports: [InstallmentsService],
})
export class InstallmentsModule { }
