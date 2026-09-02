import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  cotizacion1?: string;

  @IsString()
  @IsOptional()
  cotizacion2?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  favoriteCurrencies?: string[];
}
