import { Injectable, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { getLogger } from '../../shared/logger';
import BigNumber from 'bignumber.js';

const logger = getLogger('CurrencyRegistryService');

@Injectable()
export class CurrencyRegistryService implements OnModuleInit {
  constructor(
  ) {}
  onModuleInit() {
  }

  _registryData = {
    //will be changed
    eth: {
      symbol: 'eth',
      networkSymbol: 'eth',
      name: 'Ethereum',
      platform: 'eth',
      isNative: true,
      scale: 18,
    },
    biv: {
      symbol: 'biv',
      networkSymbol: 'biv',
      name: 'Bitcoin Value',
      scale: 8,
      isNative: true,
      platform: 'biv',
    },
  };

  _userCurrencies = [];

  async getOneCurrencyWithoutFail(symbol: string) {
    const lcSymbol = symbol.toLowerCase();
    if (!this._registryData[lcSymbol]) {
      throw new Error(`Try to get invalid currency: ${lcSymbol}`);
    }

    return this._registryData[symbol];
  }

  public getOneCurrency(symbol: string) {
    const lcSymbol = symbol.toLowerCase();
    return this._registryData[lcSymbol];
  }

  public getOneCurrencyByNetworkSymbol(networkSymbol: string) {
    const lcNetworkSymbol = networkSymbol.toLocaleLowerCase();
    const symbol = Object.keys(this._registryData).find(
      (key) => this._registryData[key].networkSymbol.toLowerCase() === lcNetworkSymbol,
    );
    return this._registryData[symbol];
  }

  async getAllSymbols() {
    return _.values(this._registryData).map((item) => item.symbol);
  }

  async getListCurrencies() {
    return _.values(this._registryData);
  }

  async getUserCurrencyFromCustomSymbol(userId: number, customSymbol: string) {
    for (let i = 0; i < this._userCurrencies.length; i++) {
      const userCurrency = this._userCurrencies[i];
      if (userCurrency.user_id === userId && userCurrency.custom_symbol === customSymbol) {
        return userCurrency;
      }
    }

    return null;
  }

  async getUserCurrencyFromSystemSymbol(userId: number, systemSymbol: string) {
    return this._userCurrencies.find(
      (currency) => currency.user_id === userId && currency.system_symbol === systemSymbol,
    );
  }

  getUnitAmount(amount: string, currency: string) {
    const iCurrency: any = this.getOneCurrency(currency);
    return new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(iCurrency.scale))
      .toFixed(iCurrency.scale);
  }

  _convertUnitToNativeBalance(balance: BigNumber, scale: number) {
    if (!balance) {
      return '0.0';
    }
    return new BigNumber(balance).div(new BigNumber(10).pow(scale)).toFixed(scale);
  }

  public getHumanReadableAmount(amount: BigNumber, currency: string) {
    const iCurrency = this.getOneCurrency(currency);
    return this._convertUnitToNativeBalance(amount, iCurrency.scale);
  }
}
