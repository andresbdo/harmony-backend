import { IsNumber, IsString, IsEnum, IsOptional, IsDateString, IsBoolean, IsObject, ValidateIf } from 'class-validator';

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
    TRANSFER = 'TRANSFER',
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
    paymentMethod: PaymentMethod;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.BANK_ACCOUNT)
    @IsString()
    bankAccountId?: string;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.CARD)
    @IsString()
    cardId?: string;

    @IsString()
    @IsOptional()
    workspaceId?: string;

    @IsString()
    @IsOptional()
    paidByMemberId?: string;

    @IsBoolean()
    @IsOptional()
    isRecurrent?: boolean;

    @IsObject()
    @IsOptional()
    recurrenceRule?: any;
}

export class UpdateTransactionDto extends CreateTransactionDto { }
