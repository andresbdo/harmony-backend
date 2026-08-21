import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    color: string;

    @IsString()
    @IsNotEmpty()
    icon: string;

    @IsString()
    @IsNotEmpty()
    scope: string;

    @IsString()
    @IsOptional()
    workspaceId?: string;
}

export class UpdateCategoryDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    color?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    scope?: string;

    @IsString()
    @IsOptional()
    workspaceId?: string;
}
