import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  findAll(@Request() req) {
    return this.subscriptionsService.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.subscriptionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  deactivate(@Request() req, @Param('id') id: string) {
    return this.subscriptionsService.deactivate(id, req.user.id);
  }
}
