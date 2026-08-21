import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiTokenStrategy } from './strategies/api-token.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ApiTokensController } from './api-tokens/api-tokens.controller';
import { ApiTokensService } from './api-tokens/api-tokens.service';

@Module({
  imports: [UsersModule, PrismaModule, WorkspacesModule, JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: async (config: ConfigService) => {
      const secret = config.get<string>('JWT_SECRET');
      const expiresIn = config.get<string>('JWT_EXPIRES_IN');
      if (!secret || !expiresIn) {
        throw new Error('JWT_SECRET or JWT_EXPIRES_IN is not defined');
      }
      return {
        secret,
        signOptions: { expiresIn: expiresIn as string },
      } as JwtModuleOptions;
    },
    inject: [ConfigService],
  })],
  providers: [AuthService, JwtStrategy, ApiTokenStrategy, ApiTokensService],
  controllers: [AuthController, ApiTokensController],
  exports: [JwtStrategy],
})
export class AuthModule { }
