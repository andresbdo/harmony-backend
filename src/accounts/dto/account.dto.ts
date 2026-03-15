import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

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
}

export class UpdateBankAccountDto extends CreateBankAccountDto { }

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

export class UpdateCardDto extends CreateCardDto { }
