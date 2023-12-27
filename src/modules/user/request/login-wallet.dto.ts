import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class LoginWallet {
    @ApiProperty({
        type: String,
        example: 'address'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    address: string;

    @ApiProperty({
        type: String,
        example: 'signature'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(600)
    signature: string;
}