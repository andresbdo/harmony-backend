import { IsIn } from 'class-validator';

export class UpdateSettlementStatusDto {
    @IsIn(['SETTLED'])
    status: 'SETTLED';
}
