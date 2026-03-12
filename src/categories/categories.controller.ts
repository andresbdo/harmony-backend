import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    findAll(
        @Query('scope') scope?: string,
        @Query('workspaceId') workspaceId?: string,
    ) {
        return this.categoriesService.findAll({ scope, workspaceId });
    }
}
