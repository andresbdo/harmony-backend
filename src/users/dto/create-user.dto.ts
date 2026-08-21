import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(1)
    @MaxLength(50)
    name: string;

    @IsString()
    @MinLength(1)
    @MaxLength(50)
    lastName: string;

    @IsString()
    @MinLength(6)
    @MaxLength(20)
    password: string;

    @IsOptional()
    @IsString()
    preferredCurrency?: string;

    @IsOptional()
    @IsString()
    inviteToken?: string;
}
