import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from 'class-validator';

export class UpdatePassword {
    
    @ApiProperty({
        type: String,
        example: 'password'
    })
    @IsNotEmpty()
    oldPassword: string;

    @ApiProperty({
        type: String,
        example: 'password'
    })
    @IsNotEmpty()
    newPassword: string;

}