import { Controller, Delete, ForbiddenException, Get, Param, Request } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.usersService.findOnePublic({ id });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.usersService.remove({ id });
  }
}
