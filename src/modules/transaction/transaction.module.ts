import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../database/entities';
import { AuthService } from '../admin/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { Admin } from '../../database/entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([Admin]),
        TypeOrmModule.forFeature([Transaction]),
        JwtModule.register({}),
    ],
    providers: [TransactionService, AuthService],
    controllers: [TransactionController],
})
export class TransactionModule { }
