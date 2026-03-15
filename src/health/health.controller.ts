import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  check() {
    return { status: 'ok' };
  }
}
