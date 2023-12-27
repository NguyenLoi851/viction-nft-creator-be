import { ConnectionOptions } from 'typeorm';
import {
  Address,
  User,
  Admin,
  CurrencyConfig,
  KmsCmk,
  KmsDataKey,
  Transaction,
  MailJob,
  MailLog,
  LatestBlock,
  Config,
  Collection
} from '../database/entities';

export const databaseConfig: ConnectionOptions = {
  type: (process.env.TYPEORM_CONNECTION || 'mysql') as any,
  host: process.env.TYPEORM_HOST || 'localhost',
  port: parseInt(process.env.TYPEORM_PORT) || 3306,
  username: process.env.TYPEORM_USERNAME || 'root',
  password: process.env.TYPEORM_PASSWORD || '123456a@A',
  database: process.env.TYPEORM_DATABASE || 'x_wallet',
  entities: [
    Address,
    CurrencyConfig,
    KmsCmk,
    KmsDataKey,
    Transaction,
    MailJob,
    MailLog,
    User,
    Admin,
    LatestBlock,
    Config,
    Collection
  ],
  synchronize: true,
};
