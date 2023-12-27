import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../database/entities';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(Admin)
        private usersRepository: Repository<Admin>,
    ) { }

    async setTwoFactorAuthenticationSecret(secret: string, userId: number) {
        return this.usersRepository.update(userId, {
            twoFactorAuthenticationSecret: secret
        });
    }

    async turnOnTwoFactorAuthentication(userId: number) {
        return this.usersRepository.update(userId, {
            isActive2fa: true
        });
    }
}