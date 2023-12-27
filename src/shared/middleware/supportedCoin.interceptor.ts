import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Causes as InternalException } from '../../config/exception/causes';
import { CurrencyRegistryService } from '../../modules/common/currency.service';
import ICurrency from '../interfaces/ICurrency';
import { getLogger } from '../logger';

const logger = getLogger('SupportedCoinInterceptor');

@Injectable()
export class SupportedCoinInterceptor implements NestInterceptor {
  constructor(private readonly CurrencyRegistry: CurrencyRegistryService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const symbol = req.params.currency?.toLowerCase() || req.body.currency?.toLowerCase();

    if (!symbol) {
      throw InternalException.INTERNAL_ERROR;
    }

    let currency = this.CurrencyRegistry.getOneCurrency(symbol);

    if (!currency) {
      currency = this.CurrencyRegistry.getOneCurrencyByNetworkSymbol(symbol);
    }

    if (!currency) {
      throw new HttpException(`Unsupported currency: ${symbol}`, HttpStatus.BAD_REQUEST);
    }

    const transformedCurrency: ICurrency = {
      platform: currency.platform.toLowerCase(),
      symbol: currency.symbol.toLowerCase(),
      networkSymbol: currency.networkSymbol.toLowerCase(),
      name : undefined,
      isUTXOBased : undefined,
      isNative : undefined,
      humanReadableScale : undefined,
      nativeScale : undefined,
      hasMemo : undefined,
    };
    
    req.currency = transformedCurrency;

    return next.handle();
  }
}
