import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Delete(':id')
  deleteOne(@Request() req, @Param('id') id: string) {
    return this.notificationsService.deleteOne(id, req.user.id);
  }
}
