import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { CreateInstallmentPurchaseDto } from './dto/installment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
    constructor(private readonly installmentsService: InstallmentsService) { }

    @Get()
    findAll(@Request() req) {
        return this.installmentsService.findAll(req.user.id);
    }

    @Post()
    create(@Request() req, @Body() dto: CreateInstallmentPurchaseDto) {
        return this.installmentsService.create(req.user.id, dto);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.installmentsService.findOne(id, req.user.id);
    }

    @Delete(':id')
    cancel(@Request() req, @Param('id') id: string) {
        return this.installmentsService.cancel(id, req.user.id);
    }
}
