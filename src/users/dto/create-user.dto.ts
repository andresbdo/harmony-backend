import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(1)
    @MaxLength(10)
    name: string;

    @IsString()
    @MinLength(1)
    @MaxLength(10)
    lastName: string;

    @IsString()
    @MinLength(6)
    @MaxLength(20)
    password: string;
}
