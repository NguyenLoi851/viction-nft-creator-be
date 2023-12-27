import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address, KmsDataKey, LatestBlock } from '../../database/entities';
import { CommonModule } from '../common/common.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkerManagerService } from './worker-manager.service';
import { Transaction } from 'src/database/entities/Transaction.entity';
import { AddressesModule } from '../addresses/addresses.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([KmsDataKey, Address, LatestBlock, Transaction]), 
    CommonModule,
    AddressesModule,
    NotificationModule,
    ScheduleModule.forRoot()],
  controllers: [],
  exports: [TypeOrmModule, WorkerManagerService],
  providers: [WorkerManagerService],
})
export class WorkerModule {}
