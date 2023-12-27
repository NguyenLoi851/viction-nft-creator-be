import * as AWS from 'aws-sdk';
import { Repository } from 'typeorm';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';

import { getLogger } from '../../shared/logger';
import { KmsDataKey, KmsCmk } from '../../database/entities';
import { Causes } from '../../config/exception/causes';

const DUMMY_DATA_KEY = 'crueltycommentshaft';
const ENCRYPT_ALGORITHM = 'aes256';
const logger = getLogger('KMSService');

@Injectable()
export class KmsService implements OnModuleInit {
  constructor(
    @InjectRepository(KmsDataKey)
    private kmsDataKeyRepository: Repository<KmsDataKey>,

    @InjectRepository(KmsCmk)
    private kmsCmkRepository: Repository<KmsCmk>,
  ) {
    this.LOCAL_CACHED_RECORDS = {};
  }

  onModuleInit() {
    this.setup();
  }

  private LOCAL_CACHED_RECORDS: any;
  private awsCredentials = null;

  async _getCachedRecordById(tableName: string, id: string) {
    if (!this.LOCAL_CACHED_RECORDS[tableName]) {
      this.LOCAL_CACHED_RECORDS[tableName] = {};
    }

    if (this.LOCAL_CACHED_RECORDS[tableName][id]) {
      return this.LOCAL_CACHED_RECORDS[tableName][id];
    }

    let record: any;
    if (tableName === 'kms_cmk') {
      record = await this.kmsCmkRepository.findOne({
        id,
      });
    }
    if (tableName === 'kms_data_key') {
      record = await this.kmsDataKeyRepository.findOne({
        id: parseInt(id),
      });
    }

    if (!record) {
      logger.error(`Not found record: table=${tableName}, id=${id}`);
      throw Causes.KMS_CMK_INVALID;
    }

    this.LOCAL_CACHED_RECORDS[tableName][id] = JSON.parse(JSON.stringify(record));
    return this.LOCAL_CACHED_RECORDS[tableName][id];
  }

  async _getKMSInstanceByKeyId(cmkId: string) {
    const cmk = await this._getCachedRecordById('kms_cmk', cmkId);
    if (!this.awsCredentials) {
      this.awsCredentials = await this.getAWSCredentials();
    }
    return new AWS.KMS({
      region: cmk.region,
      credentials: this.awsCredentials,
    });
  }

  // Get details of CMK for provided KeyId
  // async getMasterKey(cmkId: string) {
  //   const kms = await this._getKMSInstanceByKeyId(cmkId);
  //   const result = await kms.describeKey({ KeyId: cmkId }).promise();
  //   return result;
  // }

  // Generate a new random data key with provided KeyId
  // Use this practice: https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html
  async generateDataKey(cmkId: string) {
    if (!cmkId) {
      logger.error(`Cannot generate data key with invalid cmk id: ${cmkId}`);
      throw Causes.KMS_CMK_INVALID;
    }

    const kms = await this._getKMSInstanceByKeyId(cmkId);
    const { Plaintext, CiphertextBlob } = await kms
      .generateDataKey({ KeyId: cmkId, KeySpec: 'AES_256' })
      .promise();
    return {
      plain: Plaintext.toString('base64'),
      cipher: CiphertextBlob.toString('base64'),
    };
  }

  // Get plain text data key from encrypted data key
  // Suppose the KeyId that was used to generate the data key is still exists
  async getDataKey(dataKeyId: string) {
    const dataKeyRecord = await this._getCachedRecordById('kms_data_key', dataKeyId);
    const encryptedDataKey = dataKeyRecord.encryptedDataKey;
    const kms = await this._getKMSInstanceByKeyId(dataKeyRecord.cmkId);
    const { Plaintext } = await kms
      .decrypt({ CiphertextBlob: Buffer.from(encryptedDataKey, 'base64') })
      .promise();
    return Plaintext.toString('base64');
  }

  // Encrypt arbitrary data, using the data key that is defined in environment variable
  async encrypt(plainText: string, dataKeyId: string) {
    if (typeof plainText !== 'string') {
      throw Causes.ONLY_SUPPORT_STRING;
    }

    let dataKey = DUMMY_DATA_KEY;
    if (!dataKeyId && dataKeyId.length > 0) {
      dataKey = await this.getDataKey(dataKeyId);
    } else if (process.env.NODE_ENV.startsWith('prod')) {
      // production environment requires data key id
      throw Causes.KMS_DATA_KEY_NOT_FOUND;
    }
    // The IV is usually passed along with the ciphertext.
    const iv = Buffer.alloc(16, 0); // Initialization vector.
    const key = crypto.scryptSync(Buffer.from(dataKey, 'base64'), 'salt', 32);
    const cipher = crypto.createCipheriv(ENCRYPT_ALGORITHM, key, iv);
    let crypted = cipher.update(plainText, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  }

  // Decrypt data, using the data key that is defined in environment variable
  async decrypt(cipherText: string, dataKeyId: string) {
    let dataKey = DUMMY_DATA_KEY;
    if (!dataKeyId && dataKeyId.length > 0) {
      dataKey = await this.getDataKey(dataKeyId);
    } else if (process.env.NODE_ENV.startsWith('prod')) {
      // production environment requires data key id
      throw Causes.KMS_DATA_KEY_NOT_FOUND;
    }
    // The IV is usually passed along with the ciphertext.
    const iv = Buffer.alloc(16, 0); // Initialization vector.
    const key = crypto.scryptSync(Buffer.from(dataKey, 'base64'), 'salt', 32);
    const decipher = crypto.createDecipheriv(ENCRYPT_ALGORITHM, key, iv);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async _combineData(plainText: string, dataKeyId: string) {
    const dataKey = await this.getDataKey(dataKeyId);
    return `${plainText}:${dataKey}`;
  }

  // TODO: don't use anywhere
  // async hash(plainText, dataKeyId) {
  //   const result = await bcrypt.hash(await this._combineData(plainText, dataKeyId), 7);
  //   return result;
  // }

  // async verify(plainText, hash, dataKeyId) {
  //   const result = await bcrypt.compare(await this._combineData(plainText, dataKeyId), hash);
  //   return result;
  // }

  // async hashWithdrawal(wPayload) {
  //   const plainText = JSON.stringify({
  //     user_id: wPayload.user_id,
  //     currency: wPayload.currency,
  //     from_address: wPayload.fromAddress,
  //     to_address: wPayload.toAddress,
  //     amount: wPayload.amount,
  //     kms_data_key_id: wPayload.kms_data_key_id,
  //     created_at: wPayload.created_at,
  //   });
  //   return this.hash(plainText, wPayload.kms_data_key_id);
  // }

  // async verifyWithdrawal(withdrawal) {
  //   const plainText = JSON.stringify({
  //     user_id: withdrawal.user_id,
  //     currency: withdrawal.currency,
  //     from_address: withdrawal.fromAddress,
  //     to_address: withdrawal.toAddress,
  //     amount: withdrawal.amount,
  //     kms_data_key_id: withdrawal.kms_data_key_id,
  //     created_at: withdrawal.created_at,
  //   });

  //   return this.verify(plainText, withdrawal.hashCheck, withdrawal.kms_data_key_id);
  // }

  private async getAWSCredentials(): Promise<AWS.Credentials> {
    const providers: any[] = [];
    // read from ~/.aws/credentials
    const fileProvider = new AWS.SharedIniFileCredentials({
      profile: process.env.AWS_PROFILE_NAME || 'default',
    });
    providers.push(fileProvider);
    // read from ec2 instance
    const ec2MetadataProvider = new AWS.EC2MetadataCredentials();
    providers.push(ec2MetadataProvider);
    const chain = new AWS.CredentialProviderChain(providers);
    // make credentials
    return await chain.resolvePromise();
  }

  // Make sure there's always at least 1 record in kms_data_key table
  setup() {
    this._setup().catch((e) => {
      logger.error(`Setup data key failed with error:`);
      logger.error(e);
      console.log(e);
    });
  }

  async _setup() {
    const existedKey = await this.kmsDataKeyRepository.findOne({
      isEnabled: 1,
    });
    if (existedKey) {
      return;
    }
    logger.info(`There is no key in database yet. Will try to create a new default one.`);
    const cmk = await this.kmsCmkRepository.findOne({
      isEnabled: true,
    });
    if (!cmk) {
      logger.warn(`Could not find the default CMK`);
      if (process.env.NODE_ENV.startsWith('prod')) {
        process.exit(1);
      }
      return;
    }

    const newKey = await this.generateDataKey(cmk.id);
    let dataKey = this.kmsDataKeyRepository.create({
      cmkId: cmk.id,
      encryptedDataKey: newKey.cipher,
    });
    dataKey = await this.kmsDataKeyRepository.save(dataKey);
    logger.info(
      `Created new kms data key successfully: id=${dataKey.id}, cmkId=${cmk.id}, encrypted=${newKey.cipher}`,
    );
  }
}
