import { IsEmail, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class FindUserDto {
    @ValidateIf((dto) => !dto.email)
    @IsUUID('4')
    @IsOptional()
    id?: string;

    @ValidateIf((dto) => !dto.id)
    @IsEmail()
    @IsOptional()
    email?: string;
}