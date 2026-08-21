import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { CategoriesModule } from './categories/categories.module';
import { HealthModule } from './health/health.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    UsersModule,
    AuthModule,
    PrismaModule,
    DashboardModule,
    TransactionsModule,
    AccountsModule,
    WorkspacesModule,
    BudgetsModule,
    CategoriesModule,
    HealthModule,
    EncryptionModule,
    ExchangeRatesModule,
    NotificationsModule,
    SubscriptionsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
