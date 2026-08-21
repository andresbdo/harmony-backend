import { IsString, IsNumber, IsEnum, IsDateString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export enum SubscriptionFrequency {
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsNumber() amount: number;
  @IsString() @IsNotEmpty() currency: string;
  @IsEnum(SubscriptionFrequency) frequency: SubscriptionFrequency;
  @IsDateString() nextBillingDate: string;
  @IsString() @IsNotEmpty() workspaceId: string;
}

export class UpdateSubscriptionDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @IsOptional() amount?: number;
  @IsString() @IsOptional() currency?: string;
  @IsEnum(SubscriptionFrequency) @IsOptional() frequency?: SubscriptionFrequency;
  @IsDateString() @IsOptional() nextBillingDate?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
