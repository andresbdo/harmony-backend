import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
