import { Injectable, HttpException, HttpStatus, HttpService } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrencyConfig } from '../../database/entities/CurrencyConfig.entity';
import { CurrencyRegistryService } from './currency.service';
import { getLogger } from '../../shared/logger';
import * as redis from 'redis';

const logger = getLogger('BlockchainService');

@Injectable()
export class BlockchainService {
  constructor(
    private readonly httpService: HttpService,

    private readonly currencyRegistryService: CurrencyRegistryService,

    @InjectRepository(CurrencyConfig)
    private currencyConfigRepository: Repository<CurrencyConfig>,
  ) {}
  currencyConfigMap = new Map();

  async getConfig(coin: string) {
    const existedTk = this.currencyConfigMap.get(coin);
    if (existedTk) {
      return existedTk;
    }

    // // Get currency information
    // const currency = this.currencyRegistryService.getOneCurrency(coin);
    // let config = null;
    // // Firstly check whethere it has specific config
    // if (currency) {
    //   config = await this.currencyConfigRepository.findOne({
    //     currency: currency.symbol,
    //   });

    //   // If not, fallback to the config of family
    //   if (!config) {
    //     config = await this.currencyConfigRepository.findOne({
    //       currency: currency.platform,
    //     });
    //   }
    // } else {
    //   config = await this.currencyConfigRepository.findOne({
    //     currency: coin,
    //   });
    // }

    // this.currencyConfigMap.set(coin, config);
    return this.currencyConfigMap.get(coin);
  }

  async getApiEndpoint(coin: string) {
    const config = await this.getConfig(coin);
    return `${config.internal_endpoint || config.internalEndpoint}/api`;
  }

  async getAddress(coin: string, params = {}) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService.get(`${api}/${coin}/address`, { params }).toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(
        e,
        `Could not create new address coin=${coin} params=${JSON.stringify(params)}`,
      );
    }
  }

  async getBalance(systemSymbol: string, address: string) {
    const api = await this.getApiEndpoint(systemSymbol);
    try {
      const response = await this.httpService
        .get(`${api}/${systemSymbol}/address/${address}/balance`)
        .toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(
        e,
        `Could not get balance of coin=${systemSymbol} address=${address}`,
      );
    }
  }

  /**
   * @param coin (eth, ...)
   * @param contractAddress
   * @returns {Promise<*>}
   */
  async getCurrencyConfiguration(coin: string, contractAddress: string) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService
        .get(`${api}/currency_config/${contractAddress}`)
        .toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, e.message);
    }
  }

  async getTx(coin: string, txid: string) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService.get(`${api}/${coin}/tx/${txid}`).toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, `Could not get tx of coin=${coin} txid=${txid}`);
    }
  }

  async validateAddress(coin: string, address: string) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService
        .get(`${api}/${coin}/address/${address}/validate`)
        .toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, `Could not validate coin=${coin} address=${address}`);
    }
  }

  async isNeedTag(coin: string, address: string) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService
        .get(`${api}/${coin}/address/${address}/tag`)
        .toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, `Could not validate coin=${coin} address=${address}`);
    }
  }

  async notifyNewToken(type: string) {
    const pub = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    });
    pub.publish(`PP70ExC8Hr`, 'EVENT_NEW_ERC20_TOKEN_ADDED');
    return true;
  }

  async notifyRemoveToken(type: string) {
    const pub = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    });
    pub.publish(`PP70ExC8Hr`, 'EVENT_NEW_ERC20_TOKEN_REMOVED');
    return true;
  }

  async createAdaAccount(coin: string, params: any) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService.get(`${api}/${coin}/account`, { params }).toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, `Could not create ADA account params=${JSON.stringify(params)}`);
    }
  }

  async getNormalizeAddress(coin: string, address: string) {
    const api = await this.getApiEndpoint(coin);
    try {
      const response = await this.httpService
        .get(`${api}/${coin}/address/${address}/normalized`)
        .toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(e, `Could not convert ${address} to a checksum address.`);
    }
  }

  async getEstimateFee(
    coin: string,
    params: {
      total_inputs: number;
      recent_withdrawal_fee?: number;
      use_lower_network_fee?: boolean;
    },
  ) {
    const api = await this.getApiEndpoint(coin);
    logger.info(`getApiEndpoint.... ${api}`)
    const { total_inputs, recent_withdrawal_fee, use_lower_network_fee } = params;
    let url = `${api}/${coin}/estimate_fee?total_inputs=${total_inputs}`;

    if (recent_withdrawal_fee) {
      url += `&recent_withdrawal_fee=${recent_withdrawal_fee}`;
    }
    if (use_lower_network_fee) {
      url += `&use_lower_network_fee=${use_lower_network_fee}`;
    }
    try {
      logger.info(`getApiEndpoint.... ${url}`)
      const response = await this.httpService.get(url).toPromise();
      return response.data;
    } catch (e) {
      return this._forwardError(
        e,
        `Could not estimate fee for currency: ${coin} with params: ${params}.`,
      );
    }
  }

  // When error happens on proxy server
  async _forwardError(e, errLog) {
    let errMsg = e.toString();

    if (e.code === 'ECONNREFUSED') {
      logger.error(`${errLog}. Error=${e.message}`);
      throw new HttpException(
        `blockchain service is not started yet...`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (e.response && e.response.data) {
      const { data } = e.response;

      if (data.error) {
        if (typeof data.error === 'string') {
          errMsg = data.error;
        } else {
          errMsg = JSON.stringify(data.error);
        }
      } else {
        errMsg = JSON.stringify(data);
      }
    }

    logger.error(`${errLog}. Error=${errMsg}`);
    throw new HttpException(errMsg, HttpStatus.BAD_REQUEST);
  }
}
