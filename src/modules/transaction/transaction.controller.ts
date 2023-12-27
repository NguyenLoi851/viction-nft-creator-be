import {
    Controller,
    Get,
    UseGuards,
    HttpStatus,
    Query,
    DefaultValuePipe
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PaginationResponse } from 'src/config/rest/paginationResponse';
import { Transaction } from '../../database/entities';

@Controller()
export class TransactionController {
    constructor(
        private readonly transactionService: TransactionService
    ) { }

    @Get('transactions')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        tags: ['transactions'],
        operationId: 'getTransactions',
        summary: 'Get all transactions',
        description: 'Get all transactions',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: Transaction,
    })
    @ApiQuery({
        name: 'status',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'from_network',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'from_address',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'to_address',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'type',
        required: true,
        type: String,
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
    })
    async getAllWalletsDeposits(
        @Query('status') status: string,
        @Query('from_network') from_network: number,
        @Query('from_address') from_address: string,
        @Query('to_address') to_address: string,
        @Query('type') type: string,
        @Query('page', new DefaultValuePipe(1)) page: string,
        @Query('limit', new DefaultValuePipe(10)) limit: string,
    ): Promise<PaginationResponse<Transaction>> {
        return this.transactionService.getAllTransaction(status, from_network, from_address, to_address, type, {
            page,
            limit,
        });
    }

    @Get('transaction')
    @ApiOperation({
        tags: ['transaction'],
        operationId: 'getTransaction',
        summary: 'Get all transaction',
        description: 'Get all transaction',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
        type: Transaction,
    })
    @ApiQuery({
        name: 'origin_txid',
        required: false,
        type: String,
    })
    
    async getTransaction(
        @Query('origin_txid') origin_txid: string,
    ): Promise<Transaction> {
        return this.transactionService.getTransaction(origin_txid);
    }
}
