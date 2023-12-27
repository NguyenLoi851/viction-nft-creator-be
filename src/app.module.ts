import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  GoogleRecaptchaModule,
  GoogleRecaptchaNetwork,
} from "@nestlab/google-recaptcha";
import { Connection } from "typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { databaseConfig } from "./config/database.config";
import { AuthModule } from "./modules/admin/auth.module";
import { AuthUserModule } from "./modules/user/auth.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { CommonModule } from "./modules/common/common.module";
import { TransformInterceptor } from "./config/rest/transform.interceptor";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ExceptionFilter } from "./config/exception/exception.filter";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { WebhookModule } from "./modules/webhook/webhook.module";
import { CollectionModule } from "./modules/collection/collection.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    GoogleRecaptchaModule.forRoot({
      secretKey: process.env.GOOGLE_RECAPTCHA_SECRET_KEY,
      response: (req) => req.headers.recaptcha,
      skipIf: process.env.NODE_ENV !== "production",
      network: GoogleRecaptchaNetwork.Recaptcha,
    }),
    CollectionModule,
    // AuthModule,
    // AuthUserModule,
    // AddressesModule,
    // CommonModule,
    // TransactionModule,
    // WebhookModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionFilter,
    },
  ],
})
export class AppModule {
  constructor(private connection: Connection) {}
}
