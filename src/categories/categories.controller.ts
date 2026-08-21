import { Controller, Get, Query, UseGuards, Request, Patch, Delete, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    findAll(
        @Request() req,
        @Query('scope') scope?: string,
        @Query('workspaceId') workspaceId?: string,
    ) {
        return this.categoriesService.findAll(req.user.id, { scope, workspaceId });
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.categoriesService.update(id, dto, req.user.id);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.categoriesService.remove(id, req.user.id);
    }
}
