import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';
import * as CryptoJS from 'crypto-js';
import { SelectQueryBuilder } from 'typeorm';

export function nowInMillis(): number {
  return Date.now();
}

// Alias for nowInMillis
export function now(): number {
  return nowInMillis();
}

export function nowInSeconds(): number {
  return (nowInMillis() / 1000) | 0;
}

export function addHttps(url: string) {
  if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

export function checkIPaginationOptions(options: IPaginationOptions): boolean {
  if (options.limit == 0 || options.page == 0) {
    return false;
  }
  return true;
}

export function encrypt(data: string) {
  return CryptoJS.MD5(data).toString();
}

export function convertToString(value: any) {
  return (typeof value === 'string') ? value : '';
}

export function convertToObject(value: any) {
  return (typeof value === 'object') ? value : {};
}

export function getArrayPagination<T>(totalItems: any[], options: any): Pagination<T> {
  const { limit, page } = options;

  const selectedItems = totalItems.slice((page - 1) * limit, page * limit);
  const pagination = {
    totalItems: totalItems.length,
    itemCount: selectedItems.length,
    itemsPerPage: limit,
    totalPages: Math.ceil(totalItems.length / limit),
    currentPage: page,
  };

  return new Pagination(selectedItems, pagination, null);
}

export function existValueInEnum(type: any, value: any): boolean {
  return (
    Object.keys(type)
      .filter((k) => isNaN(Number(k)))
      .filter((k) => type[k] === value).length > 0
  );
}
