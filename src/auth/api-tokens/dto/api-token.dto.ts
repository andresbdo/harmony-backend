import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApiTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    name: string;
}
