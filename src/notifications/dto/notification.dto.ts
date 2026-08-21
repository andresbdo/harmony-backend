import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  metadata?: any;
}

