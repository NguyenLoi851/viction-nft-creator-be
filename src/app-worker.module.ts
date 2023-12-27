import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/admin/auth.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CommonModule } from './modules/common/common.module';
import { TransformInterceptor } from './config/rest/transform.interceptor';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ExceptionFilter } from './config/exception/exception.filter';
import { WorkerModule } from './modules/worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    CommonModule,
    WorkerModule
  ],
  controllers: [],
  providers: [],
})
export class AppWorkerModule {
  constructor(private connection: Connection) {}
}
