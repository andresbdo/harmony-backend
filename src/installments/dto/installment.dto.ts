import { IsString, IsNumber, IsInt, IsEnum, IsOptional, IsNotEmpty, ValidateIf, Min, Max } from 'class-validator';
import { PaymentMethod } from '../../transactions/dto/transaction.dto';

export enum InstallmentDateMode {
    STATEMENT = 'STATEMENT',
    FIXED_DAY = 'FIXED_DAY',
}

export class CreateInstallmentPurchaseDto {
    @IsString() @IsNotEmpty() description: string;

    @IsNumber() installmentAmount: number;

    @IsInt() @Min(2) totalInstallments: number;

    @IsString() @IsNotEmpty() currency: string;

    @IsString() @IsNotEmpty() categoryId: string;

    @IsString() @IsNotEmpty() workspaceId: string;

    @IsEnum(PaymentMethod) @IsOptional() paymentMethod?: PaymentMethod | null;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.BANK_ACCOUNT)
    @IsString()
    bankAccountId?: string;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.CARD)
    @IsString()
    cardId?: string;

    @IsString() @IsOptional() paidByMemberId?: string;

    @IsEnum(InstallmentDateMode) dateMode: InstallmentDateMode;

    @ValidateIf(o => o.dateMode === InstallmentDateMode.FIXED_DAY)
    @IsInt()
    @Min(1)
    @Max(31)
    fixedDay?: number;
}
