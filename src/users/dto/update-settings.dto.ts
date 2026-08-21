import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  @IsNotEmpty()
  cotizacion1: string;

  @IsString()
  @IsOptional()
  cotizacion2?: string;
}
