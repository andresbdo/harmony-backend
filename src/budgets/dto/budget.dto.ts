import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, Max } from 'class-validator';

export class CreateBudgetDto {
    @IsString()
    @IsNotEmpty()
    workspaceId: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    currency: string;

    @IsString()
    type: string; // GENERAL, CATEGORY

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsNumber()
    @Min(1)
    @Max(12)
    month: number;

    @IsNumber()
    year: number;
}

export class UpdateBudgetDto extends CreateBudgetDto { }

export class CreateSavingDto {
    @IsString()
    @IsNotEmpty()
    workspaceId: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    currency: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateSavingDto extends CreateSavingDto { }
