import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export class CreateBankAccountDto {
    @IsString()
    name: string;

    @IsString()
    type: string; // BANK, CASH, INVESTMENT

    @IsString()
    currency: string;

    @IsNumber()
    initialBalance: number;

    @IsString()
    @IsNotEmpty()
    workspaceId: string;

    @IsOptional()
    @IsString()
    @IsIn(['SAVINGS', 'CHECKING'])
    subtype?: string;
}

export class UpdateBankAccountDto extends PartialType(OmitType(CreateBankAccountDto, ['workspaceId'] as const)) { }

export class CreateCardDto {
    @IsString()
    name: string;

    @IsString()
    type: string; // CREDIT, DEBIT

    @IsString()
    @IsOptional()
    currency?: string;

    @IsNumber()
    @IsOptional()
    creditLimit?: number;

    @IsString()
    linkedBankAccountId: string;

    @IsNumber()
    statementCloseDay: number;

    @IsNumber()
    dueDay: number;
}

export class UpdateCardDto extends PartialType(CreateCardDto) { }
