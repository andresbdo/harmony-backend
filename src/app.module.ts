import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BudgetsModule } from './budgets/budgets.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    PrismaModule,
    DashboardModule,
    TransactionsModule,
    AccountsModule,
    WorkspacesModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
