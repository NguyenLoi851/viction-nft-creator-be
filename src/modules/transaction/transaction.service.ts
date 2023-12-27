import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../../database/entities';
import { Repository, Raw } from 'typeorm';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { PaginationResponse } from 'src/config/rest/paginationResponse';
import { getArrayPagination } from 'src/shared/Utils';

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
    ) { }

    async getAllTransaction(
        status: string,
        from_network: number,
        from_address: string,
        to_address: string,
        type: string,
        paginationOptions: IPaginationOptions,
    ): Promise<PaginationResponse<Transaction>> {

        var dataWhere = this.setParam(status, from_network, from_address, to_address, type);

        const transactions = await this.transactionRepo.find({
            order: {
                updatedAt: 'DESC',
            },
            where: dataWhere,
        });

        const { items, meta } = getArrayPagination<Transaction>(transactions, paginationOptions);

        return {
            results: items,
            pagination: meta,
        };
    }

    async getTransaction(
        origin_txid: string,
    ): Promise<any> {

        const transaction = await this.transactionRepo.findOne({
            order: {
                updatedAt: 'DESC',
            },
            where: {
                originTxid: origin_txid
            },
        });

        return {
            origin_txid: transaction && transaction.originTxid || null,
            txid: transaction && transaction.txid || null,
            status: transaction && transaction.status || null,
        };
    }

    setParam(status: string, from_network: number, from_address: string, to_address: string, type: string) {
        var dataWhere = {};

        if (type) {
            dataWhere['type'] = type;
        }

        if (status) {
            dataWhere['status'] = status;
        }

        if (from_network) {
            dataWhere['fromNetwork'] = from_network;
        }

        if (from_address) {
            dataWhere['fromAddress'] = Raw(() => `from_address like '%${from_address}%'`);
        }

        if (to_address) {
            dataWhere['toAddress'] = Raw(() => `to_address like '%${to_address}%'`);
        }

        return dataWhere;
    }
}
