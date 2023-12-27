import { Module, HttpModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrencyRegistryService } from './currency.service';
import { BlockchainService } from './blockchain.service';
import { KmsService } from './kms.service';
import { CurrencyConfig, KmsCmk, KmsDataKey } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([CurrencyConfig, KmsCmk, KmsDataKey]),
    HttpModule,
  ],
  exports: [TypeOrmModule, CurrencyRegistryService, BlockchainService, KmsService],
  providers: [CurrencyRegistryService, BlockchainService, KmsService],
})
export class CommonModule {}
