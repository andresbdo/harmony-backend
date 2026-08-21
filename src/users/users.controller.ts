import { Controller, Delete, ForbiddenException, Get, Param, Request, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me/settings')
  @UseGuards(JwtAuthGuard)
  getSettings(@Request() req) {
    return this.usersService.getSettings(req.user.id);
  }

  @Patch('me/settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(@Request() req, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(req.user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.usersService.findOnePublic({ id });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.usersService.remove({ id });
  }
}
