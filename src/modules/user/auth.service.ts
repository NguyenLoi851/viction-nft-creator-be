import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Check2fa } from './request/check2fa.dto';
import { Login } from './request/login.dto';
import { LoginResponse } from './response/login.dto';
import * as argon2 from 'argon2';
import { User } from '../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Register } from './request/register.dto';
import { encrypt, convertToString, convertToObject } from '../../shared/Utils';
import { MailService } from '../mail/mail.service';
import { forEach } from 'lodash';
import { RegisterWallet } from './request/register-wallet.dto';

var tokenMap = new Map();
var limitRequestLoginMap = new Map();

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,

        private readonly mailService: MailService,

        @InjectRepository(User)
        private usersRepository: Repository<User>,

    ) { }

    //login
    async validateUser(data: any): Promise<any> {
        const user = await this.getUserActiveByEmail(data.email);
        if (user && user.email && user.password && user.status && user.status == 'active') {
            const key = encrypt('Login-' + user.email);
            let dataCheck = limitRequestLoginMap.get(key) ? limitRequestLoginMap.get(key) : {};

            if (dataCheck.total && dataCheck.total >= (parseInt(process.env.LIMIT_REQUEST) || 5)) {
                if (dataCheck.timeRequest && Date.now() - dataCheck.timeRequest < (parseInt(process.env.LIMIT_HOURS_BLOCK_REQUEST) || 4) * 60 * 60 * 1000) return null;

                dataCheck.total = 0;
                dataCheck.timeRequest = Date.now();
                limitRequestLoginMap.set(key, dataCheck);
            }

            //verify hashed password and plain-password
            const isPassword = await argon2.verify(user.password, data.password);

            if (isPassword) {
                if (dataCheck.total) {
                    limitRequestLoginMap.delete(key);
                }

                const { password, ...result } = user;
                return result;

            } else {
                if (dataCheck.total) {
                    dataCheck.total += 1;
                } else {
                    dataCheck.total = 1;
                }
                dataCheck.timeRequest = Date.now();
                limitRequestLoginMap.set(key, dataCheck);
            }
        }
        return null;
    }

    isValidToken(token: string) {
        return tokenMap.get(encrypt(token)) == '1';
    }

    setValidToken(token: string) {
        tokenMap.set(encrypt(token), '1');
    }

    deleteValidToken(token: string) {
        tokenMap.delete(encrypt(token));
    }

    async login(user: any): Promise<LoginResponse> {
        const payload = { email: user.email, userId: user.id };
        const token = this.jwtService.sign(payload);

        this.setValidToken(token);
        this.updateNonce(user.wallet, user.nonce);

        return {
            email: user.email,
            token,
        };
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return this.usersRepository.findOne({ email: email });
    }

    async getUserActiveByEmail(email: string): Promise<User | undefined> {
        return this.usersRepository.findOne({ email: email, status: 'active' });
    }

    //register
    async checkDuplicatedUser(data: Register): Promise<any> {
        //check duplicated username or email
        const duplicatedUser = await this.getUserActiveByEmail(data.email);
        return duplicatedUser;
    }

    async updateProfile(user: User, data: any) {
        if (!user || !user.email || !data) return false;

        let dataUser = await this.getUserActiveByEmail(user.email);

        if (!dataUser) return false;

        for (const [key, value] of Object.entries(data)) {
            if (['firstName', 'lastName', 'phone', 'dateOfBirth', 'nationality', 'country', 'phone', 'state', 'city', 'street1', 'street2', 'zipCode', 'wallet'].includes(key)) {
                dataUser[key] = value;
            }
        }

        dataUser = await this.usersRepository.save(dataUser);

        const { password, token, twoFactorAuthenticationSecret, ...dataReturn } = dataUser;

        return dataReturn;
    }

    async updatePassword(user: User, data: any) {
        if (!user || !user.email || !data) return false;

        let dataUser = await this.getUserActiveByEmail(user.email);
        if (!dataUser) return false;

        const isPassword = await argon2.verify(dataUser.password, data.oldPassword);

        if (!isPassword) return false;

        const hashedNewPassword = await argon2.hash(data.newPassword);

        dataUser.password = hashedNewPassword;
        dataUser = await this.usersRepository.save(dataUser);

        const { password, token, twoFactorAuthenticationSecret, ...dataReturn } = dataUser;

        return dataReturn;
    }

    async activeUser(token: string) {
        if (!token) return false;

        let user = await this.getUserByToken(token);

        if (!user || user.status !== 'request') return false;

        user.status = 'active';

        user = await this.usersRepository.save(user);

        return user;
    }

    async resetPassword(token: string, password: string) {
        if (!token) return false;

        let user = await this.getUserByToken(token);

        if (!user) return false;

        const hashedPassword = await argon2.hash(password);
        user.password = hashedPassword;

        user = await this.usersRepository.save(user);

        return user;
    }

    async registerUser(data: Register): Promise<any> {
        //hash password
        const hashedPassword = await argon2.hash(data.password);

        //insert user table
        const user = await this._registerUser(data.email, hashedPassword);

        const token = await this.getToken(user);

        // send mail active
        const urlActive = process.env.URL_API + '/user/active' + '?code=' + token;
        const content = "To activate your account, please click on the link below: " + urlActive;
        const subject = "Confirm email for active account";

        await this.mailService.sendMail(user.email, subject, user.firstName, content);

        return {
            email: user.email
        };
    }

    async resendMailActiveUser(email: string): Promise<any> {

        let user = await this.getUserByEmail(email);

        if (!user) return false;

        const token = await this.getToken(user);

        // send mail active
        const urlActive = process.env.URL_API + '/user/active' + '?code=' + token;
        const content = "To activate your account, please click on the link below: " + urlActive;
        const subject = "Confirm email for active account";

        await this.mailService.sendMail(user.email, subject, user.firstName, content);

        return {
            email: user.email
        };
    }

    async sendMailResetPassword(email: string): Promise<any> {

        let user = await this.getUserActiveByEmail(email);

        if (!user) return false;

        const token = await this.getToken(user);

        // send mail active
        const urlActive = process.env.URL_FRONTEND + '/user/reset-password' + '?code=' + token;
        const content = "To update password your account, please click on the link below: " + urlActive;
        const subject = "Confirm email for reset password";

        await this.mailService.sendMail(user.email, subject, user.firstName, content);

        return {
            email: user.email
        };
    }

    async _registerUser(email: string, password: string) {

        let user = await this.getUserByEmail(email);

        if (!user) {
            user = new User();
            user.email = email;
            user.username = email;
            user.password = password;
        }

        if (user && user.status === 'request') {
            user.password = password;
        }

        user = await this.usersRepository.save(user);
        return user;
    }

    async getToken(user: User) {
        const token = this.jwtService.sign({ email: user.email, time: Date.now() });

        user.token = token;
        user = await this.usersRepository.save(user);

        return token;
    }

    async getUserByToken(token: string) {
        const data = convertToObject(this.jwtService.decode(token));

        if (!data || !data.email || !data.time || (Date.now() - data.time) > parseInt(process.env.EXPRIRE_TIME_TOKEN)) return false;

        let user = await this.getUserByEmail(data.email);

        if (!user) return false;

        return user;
    }

    logout(token: string) {
        const tokenWithoutBearer = token.split(' ')[1];

        this.deleteValidToken(tokenWithoutBearer);
    }

    async getUserByData(data: any): Promise<User | undefined> {
        let user = null;

        if (data.email) {
            user = this.usersRepository.findOne({ email: data.email });
        }

        if (data.username) {
            user = this.usersRepository.findOne({ username: data.username });
        }

        if (data.address) {
            user = this.usersRepository.findOne({ wallet: data.address });
        }

        return user;

    }

    async createUserByWallet(data: RegisterWallet): Promise<any> {
        let user = new User();
        user.email = data.email;
        user.username = data.username;
        user.wallet = data.address;
        user.status = "active";
        // user.status = "request";

        user = await this.usersRepository.save(user);
        // const tokenUser = await this.getToken(user);
        // const urlActive = process.env.URL_API + 'user/active' + '?code=' + tokenUser;
        // const content = "To activate your account, please click on the link below: " + urlActive;
        // const subject = "Confirm email for active account";

        // this.mailService.sendMail(user.email, subject, user.firstName, content);

        const { password, token, twoFactorAuthenticationSecret, ...dataUser } = user;

        return dataUser;
    }

    async getNonce(address: string) {
        const user = await this.usersRepository.findOne({ wallet: address });
        if (user) {
            return user.nonce;
        }
        return -1;
    }

    async updateNonce(address: string, nonce: number) {
        await this.usersRepository.update({ wallet: address }, { nonce: nonce + 1 });
    }
}
