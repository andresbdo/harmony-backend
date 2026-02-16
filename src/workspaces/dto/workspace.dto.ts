import { IsString, IsNumber, IsEmail, IsOptional, Min, Max } from 'class-validator';

export class CreateWorkspaceDto {
    @IsString()
    name: string;

    @IsNumber()
    @Min(1)
    @Max(31)
    cutoffDay: number;
}

export class UpdateWorkspaceDto extends CreateWorkspaceDto { }

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
