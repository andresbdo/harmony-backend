import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';

@Module({
    imports: [PrismaModule, WorkspacesModule],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule { }
