import { IsNumber, IsString, IsEnum, IsOptional, IsDateString, IsBoolean, IsObject, ValidateIf, IsNotEmpty } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
    TRANSFER = 'TRANSFER',
    SAVING = 'SAVING',
}

export enum PaymentMethod {
    CASH = 'CASH',
    BANK_ACCOUNT = 'BANK_ACCOUNT',
    CARD = 'CARD',
}

export class CreateTransactionDto {
    @IsNumber()
    amount: number;

    @IsString()
    currency: string;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(TransactionType)
    type: TransactionType;

    @IsString()
    categoryId: string;

    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod | null;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.BANK_ACCOUNT)
    @IsString()
    bankAccountId?: string;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.CARD)
    @IsString()
    cardId?: string;

    @IsString()
    @IsOptional()
    savingGoalId?: string;

    @IsString()
    @IsNotEmpty()
    workspaceId: string;

    @IsString()
    @IsOptional()
    paidByMemberId?: string;

    @IsBoolean()
    @IsOptional()
    isRecurrent?: boolean;

    @IsObject()
    @IsOptional()
    recurrenceRule?: any;

    @IsString()
    @IsOptional()
    installmentPurchaseId?: string;

    @IsOptional()
    installmentNumber?: number;
}

export class UpdateTransactionDto extends PartialType(OmitType(CreateTransactionDto, ['workspaceId'] as const)) { }

export class AssignPaymentMethodDto {
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @IsString()
    @IsOptional()
    bankAccountId?: string;

    @IsString()
    @IsOptional()
    cardId?: string;
}
