import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { KmsService } from '../../modules/common/kms.service';
import { Causes } from '../../config/exception/causes';
import { Address, CurrencyConfig, KmsDataKey, Config } from '../../database/entities';
import { getLogger } from '../../shared/logger';
import { EntityManager, getConnection, Repository } from 'typeorm';
import * as web3_types from 'web3-core/types';
import AwaitLock from 'await-lock';
 
let lock = new AwaitLock();
const Web3 = require("web3");
const logger = getLogger('AddressesService');
@Injectable()
export class AddressesService {
    constructor(
        private readonly kmsService: KmsService,

        @InjectRepository(KmsDataKey)
        private kmsDataKeysRepository: Repository<KmsDataKey>,

        @InjectRepository(Address)
        private addressesRepository: Repository<Address>,

        @InjectRepository(Config)
        private configRepository: Repository<Config>
    ) { }

    async findAll(): Promise<any[]> {
        const data = await this.addressesRepository.find();

        return data.map((e) => { return e.address });
    }

    async getAmountConfig(): Promise<any[]> {
        const data = await this.configRepository.find();

        return data;
    }

    async updateMinimum(key: string, value: string): Promise<any> {
        if (!key || !value) return false;

        var data = await this.configRepository.findOne({ key: key });

        if (!data) {
            data = new Config();
            data.key = key;
        }

        data.value = value;
        await this.configRepository.save(data);

        return data;
    }

    async getAddress(currency: CurrencyConfig): Promise<Address> {
        await lock.acquireAsync();
        try {
            if (!currency) {
                throw Causes.WALLET_WITH_CURRENCY_NOT_CREATED;
            }
            const dataKey = await this.kmsDataKeysRepository.findOne();

            let addressRecord: any;

            await getConnection().transaction(async (transactional) => {
                addressRecord = await transactional
                    .getRepository(Address)
                    .createQueryBuilder('address')
                    .useTransaction(true)
                    .setLock("pessimistic_write")
                    .getOne();

                // address already exists, return true
                if (addressRecord) {
                    return;
                }

                // address not exists, create new address
                addressRecord = await this.createWalletAddress(currency, dataKey, transactional);

            });

            return addressRecord;
        } finally {
        lock.release();
        }    
    }

    async createWalletAddress(
        currency: CurrencyConfig,
        dataKey: KmsDataKey,
        entityManager: EntityManager,
    ): Promise<Address> {
        const { address, privateKeyHandled, kmsDataKeyId } = await this.generateOneWalletAddress(
            currency,
            dataKey,
        );
        const secret = JSON.stringify({
            private_key: privateKeyHandled,
            kms_data_key_id: kmsDataKeyId,
        });
        // const record = { walletId, address, currency: coin, secret };

        const addr = this.addressesRepository.create({
            address,
            secret
        });
        await entityManager.save(addr);

        return addr;
    }

    // Generate a new wallet address without inserting to database yet
    async generateOneWalletAddress(currency: CurrencyConfig, dataKey: KmsDataKey) {

        const web3 = new Web3(currency.rpcEndpoint);
        const account: web3_types.Account = web3.eth.accounts.create();

        let kmsDataKeyId: string;
        let privateKeyHandled: string;

        if (!dataKey?.id) {
            kmsDataKeyId = "";
        } else {
            kmsDataKeyId = dataKey.id.toString();
        }
        privateKeyHandled = account.privateKey;
        privateKeyHandled = await this.kmsService.encrypt(account.privateKey, kmsDataKeyId);

        if (privateKeyHandled.length > 250) {
            throw Causes.ENCRYPT_PRIVATE_KEY_ERROR;
        }

        return { address: account.address, privateKeyHandled, kmsDataKeyId };
    }
}
