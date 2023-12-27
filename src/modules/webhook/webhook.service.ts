import { Injectable } from '@nestjs/common';
import { User } from '../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../user/auth.service'
const axios = require('axios');

@Injectable()
export class WebhookService {
    constructor(
        private authService: AuthService,

        @InjectRepository(User)
        private usersRepository: Repository<User>,

    ) { }

    async getDataKyc(id: string) {

        const instance = axios.create({
            baseURL: process.env.KYC_URL_API,
            timeout: 10000,
            headers: { 'X-API-KEY': process.env.KYC_SECRET_API_KEY }
        });

        const data = await instance.get(id);

        if (!data && !data.data && !data.data.owner) return false;

        const owner = data.data.owner;

        if (!owner || !owner.email || !owner.first_name || !owner.last_name) return false;

        const email = owner.email;

        const user = await this.authService.getUserByEmail(email);

        if (!user) return false;

        let dataUser = user.data ? JSON.parse(user.data) : {};
        dataUser.dataKyc = data.data;
        user.data = JSON.stringify(dataUser);
        user.statusKyc = data.data.status;

        await this.usersRepository.save(user);

        return data.data;
    }

}
