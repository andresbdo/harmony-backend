import { IsString, IsNumber, IsEmail, IsOptional, Min, Max, IsEnum, IsInt } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { WorkspaceCycle } from '@prisma/client';

export class CreateWorkspaceDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(31)
    cutoffDay?: number;

    @IsOptional()
    @IsEnum(WorkspaceCycle)
    cycle?: WorkspaceCycle;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(6)
    weekStartDay?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    yearStartMonth?: number;

    @IsOptional()
    @IsString()
    color?: string;
}

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) { }

export class AddMemberDto {
    @IsEmail()
    email: string;

    @IsString()
    nameAlias: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    responsibilityPercentage: number;
}

export class UpdateMemberDto {
    @IsNumber()
    @Min(0)
    @Max(100)
    responsibilityPercentage: number;

    @IsString()
    nameAlias: string;
}
