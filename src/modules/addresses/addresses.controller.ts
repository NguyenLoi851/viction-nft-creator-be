import {
    Controller,
    HttpStatus,
    Param,
    Get,
    Post,
    Req,
    UseGuards,
    Body,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupportedCoinInterceptor } from '../../shared/middleware/supportedCoin.interceptor';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { AddressResponse } from './response/address.dto';
import { AddressBase } from './response/addressBase.dto';
import { Address,  } from '../../database/entities';
import { EmptyObjectBase } from '../../shared/response/emptyObjectBase.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Get('addresses')
    findAll(): Promise<Address[]> {
        return this.addressesService.findAll()
    }

    @Get('get-amount-config')
    getAmountConfig(): Promise<any[]> {
        return this.addressesService.getAmountConfig()
    }

    @Post('update-config')
    @ApiOperation({
        tags: ['update-minimum'],
        operationId: 'updateMinimum',
        summary: 'Update Minimum',
        description: 'Update Minimum',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: EmptyObjectBase,
    })
    async updateMinimum(@Body() data: any): Promise<any> {
        return this.addressesService.updateMinimum(data.key || null, data.value || null);
    }

    @Post('addresses/:currency')
    @ApiOperation({
        tags: ['addresses'],
        operationId: 'generateNewAddress',
        summary: 'Generate new address',
        description: 'Generate new address',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: AddressBase,
    })
    @UseInterceptors(SupportedCoinInterceptor)
    async generateNewAddress(
        @Param('currency') currency: string,
        @Req() req: any,
    ): Promise<AddressResponse> {
        return null;
    }
}
