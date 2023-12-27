import { ApiResponseProperty, ApiProperty } from "@nestjs/swagger";

export class AddressResponse {
    @ApiProperty({
        type: String,
        example: '0xF7cC551106A1f4E2843A3DA0C477B6f77FA4a09d',
    })
    address: string;

    @ApiResponseProperty({
        type: String,
        example: 'eth',
    })
    currency: string;

    @ApiResponseProperty({
        type: Number,
        example: 1587464883336,
    })
    createdAt: number;

    @ApiResponseProperty({
        type: Number,
        example: 1587464883336,
    })
    updatedAt: number;

    constructor(wallet: any) {
        this.address = wallet.address;
        this.currency = wallet.currency;
        this.createdAt = wallet.createdAt;
        this.updatedAt = wallet.updatedAt;
    }
}