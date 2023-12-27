import { Controller, Post, Body, HttpStatus, UseGuards, Req, Res, Get, Headers, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service'

@Controller('')
export class WebhookController {

    constructor(
        private readonly webhookService: WebhookService
    ) { }

    @Post('/kyc-webhooks')
    @ApiOperation({
        tags: ['kyc'],
        operationId: 'kyc webhooks',
        summary: 'kyc webhooks',
        description: 'kyc webhooks',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successful',
    })
    async webhooks(@Body() data: any) {

        if (!data || !data.key) return {};

        const key = data.key;

        await this.webhookService.getDataKyc(key);

        return data;
    }

}
