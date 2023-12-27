import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterWallet {
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
        example: 'example@gmail.com'
    })
    @IsEmail()
    @MinLength(6)
    @MaxLength(100)
    email: string;

    @ApiProperty({
        type: String,
        example: 'username'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    @Matches(/^[a-z0-9]+$/i, { message: 'Username invalid' })
    username: string;

    @ApiProperty({
        type: String,
        example: 'signature'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(500)
    signature: string;

}