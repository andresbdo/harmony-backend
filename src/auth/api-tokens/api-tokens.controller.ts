import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/api-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth/api-tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokensController {
    constructor(private readonly apiTokensService: ApiTokensService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateApiTokenDto) {
        return this.apiTokensService.create(req.user.id, dto.name);
    }

    @Get()
    findAll(@Request() req) {
        return this.apiTokensService.findAll(req.user.id);
    }

    @Delete(':id')
    revoke(@Request() req, @Param('id') id: string) {
        return this.apiTokensService.revoke(req.user.id, id);
    }
}
