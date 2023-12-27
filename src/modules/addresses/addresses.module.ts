import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address, KmsDataKey, Config } from '../../database/entities';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { CommonModule } from '../common/common.module';
import { AuthService } from '../admin/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { Admin } from '../../database/entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([KmsDataKey, Address, Config]),
        CommonModule,
        TypeOrmModule.forFeature([Admin]),
        JwtModule.register({}),
    ],
    controllers: [AddressesController],
    exports: [TypeOrmModule, AddressesService],
    providers: [AddressesService, AuthService],
})
export class AddressesModule { }
