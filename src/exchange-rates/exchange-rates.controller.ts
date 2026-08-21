import { Controller, Get } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Public()
  @Get('latest')
  getLatest() {
    return this.exchangeRatesService.getLatest();
  }
}
