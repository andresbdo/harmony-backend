import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';

@Module({
    imports: [PrismaModule, WorkspacesModule],
    controllers: [AccountsController],
    providers: [AccountsService],
    exports: [AccountsService],
})
export class AccountsModule { }
