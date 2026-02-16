import { IsUUID } from "class-validator";

export class RemoveUserDto {
    @IsUUID('4')
    id: string;
}
