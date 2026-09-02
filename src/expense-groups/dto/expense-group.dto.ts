import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateExpenseGroupDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    icon: string;

    @IsString()
    @IsNotEmpty()
    color: string;
}

export class UpdateExpenseGroupDto extends PartialType(CreateExpenseGroupDto) { }

export class AssignCategoriesDto {
    @IsArray()
    @IsString({ each: true })
    categoryIds: string[];
}
