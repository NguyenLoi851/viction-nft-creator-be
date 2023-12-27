import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { KmsService } from '../common/kms.service';
import { Config, CurrencyConfig, LatestBlock } from '../../database/entities';
import { getLogger } from '../../shared/logger';
import { Repository } from 'typeorm';
import { WorkerService } from './worker.service';
import { Transaction } from 'src/database/entities/Transaction.entity';
import { AddressesService } from 'src/modules/addresses/addresses.service';
import { NotificationService } from '../notification/notification.service';

const logger = getLogger('AddressesService');


@Injectable()
export class WorkerManagerService {
  constructor(
    private readonly kmsService: KmsService,
    private readonly addressesService: AddressesService,
    private readonly notificationService: NotificationService,

    @InjectRepository(LatestBlock)
    private latestBlockRepository: Repository<LatestBlock>,

    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,

    @InjectRepository(CurrencyConfig)
    private currenciesRepository: Repository<CurrencyConfig>,

    @InjectRepository(Config)
    private configRepository: Repository<Config>
  ) 
  {this.init()}


  async init() {
    await this.kmsService.setup();
    let currencies = await this.currenciesRepository.find();
    for (let currency of currencies) {
      new WorkerService(this.kmsService, this.addressesService, 
        this.notificationService, this.latestBlockRepository, 
        this.transactionRepository, currency, this.configRepository);
    } 
  }

}
