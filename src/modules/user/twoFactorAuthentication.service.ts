import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { User } from '../../database/entities';
import { UsersService } from './user.service';
import { JwtService } from '@nestjs/jwt';
import { encrypt, convertToString } from '../../shared/Utils';

var limitRequest2faMap = new Map();
@Injectable()
export class TwoFactorAuthenticationService {
    constructor(
        private readonly usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    public async isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
        const email = user.email;
        const key = encrypt('2FA-' + email);

        let data = limitRequest2faMap.get(key) ? limitRequest2faMap.get(key) : {};

        if (data.total && data.total >= (parseInt(process.env.LIMIT_REQUEST) || 10)) {
            if (data.timeRequest && Date.now() - data.timeRequest < (parseInt(process.env.LIMIT_HOURS_BLOCK_REQUEST) || 4) * 60 * 60 * 1000) return false;

            data.total = 0;
            data.timeRequest = Date.now();
            limitRequest2faMap.set(key, data);
        }

        const isCodeValid = authenticator.verify({
            token: twoFactorAuthenticationCode,
            secret: convertToString(this.jwtService.decode(user.twoFactorAuthenticationSecret))
        });

        if (isCodeValid) {
            if (data.total) {
                limitRequest2faMap.delete(key);
            }

        } else {
            if (data.total) {
                data.total += 1;
            } else {
                data.total = 1;
            }
            data.timeRequest = Date.now();
            limitRequest2faMap.set(key, data);
        }

        return isCodeValid;
    }

    public async generateTwoFactorAuthenticationSecret(user: User) {
        const secret = this.jwtService.sign(authenticator.generateSecret());
        await this.usersService.setTwoFactorAuthenticationSecret(secret, user.id);

        return secret;
    }
}