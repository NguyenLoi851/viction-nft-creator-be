import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities';
import { MailModule } from '../mail/mail.module';
import { AuthUserModule } from '../user/auth.module';
import { AuthService } from '../user/auth.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    MailModule,
    AuthUserModule,
    JwtModule.register({}),
  ],
  providers: [WebhookService, AuthService],
  controllers: [WebhookController],
})
export class WebhookModule {}
