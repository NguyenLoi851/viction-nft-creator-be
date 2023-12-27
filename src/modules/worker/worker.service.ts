import * as _ from 'lodash';
import { KmsService } from '../common/kms.service';
import { Config, CurrencyConfig, LatestBlock } from '../../database/entities';
import { getLogger } from '../../shared/logger';
import { getConnection, In, LessThanOrEqual, Repository } from 'typeorm';
import * as ethereumjs from '@ethereumjs/tx';
import Common from "@ethereumjs/common";
import { Transaction } from 'src/database/entities/Transaction.entity';
import { BigNumber } from 'src/shared/BigNumber';
import { inspect } from 'util';
import { AddressesService } from '../addresses/addresses.service';
import { NotificationService } from '../notification/notification.service';

const EthereumTx = ethereumjs.Transaction;
const Web3 = require("web3");
const fs = require('fs')
const logger = getLogger('WorkerService');
const RETRY_INTERVAL = 1 * 60 * 1000; // 1 minutes

export class WorkerService {

  _web3 = new Web3(this.currency.rpcEndpoint);

  _common = Common.custom({chainId: Number(this.currency.chainId)});

  _bridgeAbi = fs.readFileSync('./smart-contract/XpBridge.json', 'utf8');
  _bridgeContract = new this._web3.eth.Contract(JSON.parse(this._bridgeAbi), JSON.parse(this.currency.tokenAddress)["bridge"]);

  _lootBoxAbi = fs.readFileSync('./smart-contract/LootBox.json', 'utf8');
  _lootBoxContract = new this._web3.eth.Contract(JSON.parse(this._lootBoxAbi), JSON.parse(this.currency.tokenAddress)["lootbox"]);

  _tokenAbi = fs.readFileSync('./smart-contract/IERC20.json', 'utf8');
  _tokenContract = new this._web3.eth.Contract(JSON.parse(this._tokenAbi), JSON.parse(this.currency.tokenAddress)["token"]);

  _nftAbi = fs.readFileSync('./smart-contract/GameToken.json', 'utf8');
  _nftContract = new this._web3.eth.Contract(JSON.parse(this._nftAbi), JSON.parse(this.currency.tokenAddress)["nftToken"]);

  _addminAddress = null;
  
  constructor(
    private readonly kmsService: KmsService,
    private readonly addressesService: AddressesService,
    private readonly notificationService: NotificationService,
    private latestBlockRepository: Repository<LatestBlock>,
    private transactionRepository: Repository<Transaction>,
    private currency: CurrencyConfig,
    private configRepository: Repository<Config>
  ) {
    this._setup();
  }

  async _setup() {
    this._addminAddress = await this.addressesService.getAddress(this.currency);
    if (!this._addminAddress) {
      logger.error(`${this.currency.network} WorkerService::doCrawlJob No address found`);
      return;
    }
    this.doCrawlJob();
    this.doJob();
    this.doCheckBalanceJob();
  }

  async delay(t) {
    return new Promise(resolve => setTimeout(resolve, t));
  }

  async doCrawlJob() {
    do {
      try {
        let isWaiting = await this.crawlData();
        if (isWaiting) {
          await this.delay(this.currency.averageBlockTime);
        } else {
          await this.delay(500); // 0.5 seconds, to avoid too many requests
        }
      } catch (e) {
        logger.error(`${this.currency.network} WorkerService::doCrawlJob ${e.message}`);
        this.notificationService.notificationException(e.message);
      }
    } while (true);
  }

  async doJob() {
    do {
      try {
      await this.constructSwapRawTransaction();
      await this.constructLootBoxRawTransaction();
      await this.signRawTransaction();
      await this.sendRawTransaction();
      await this.getTransactionStatus();

      const timestamp = new Date().getTime();
      const processingTransaction = await this.transactionRepository.findOne({
        where : {
          toNetwork: this.currency.swapId,
          status: In(["pending", "unsigned", "signed"]),
          retryTimestamp: LessThanOrEqual(timestamp),
        }
      });
  
      if (!processingTransaction) {
        await this.delay(this.currency.averageBlockTime);
      }
      } catch (e) {
        logger.error(`${this.currency.network} WorkerService::doJob ${e.message}`);
        this.notificationService.notificationException(e.message);
      }
    } while (true);
  }

  async doCheckBalanceJob() {
    do {
      try {
        await this.checkBalance();
        await this.delay(RETRY_INTERVAL);
      } catch (e) {
        logger.error(`${this.currency.network} WorkerService::doCheckBalanceJob ${e.message}`);
        this.notificationService.notificationException(e.message);
      }
    } while (true);
  }

  async checkBalance() {
    if (!this._tokenContract._address) {
      return;
    }
    const ethBalance = this.convertTokenBalance(new BigNumber((await this._web3.eth.getBalance(this._addminAddress.address)).toString()), 18);
    let decimals = await this._tokenContract.methods.decimals().call();
    let currencySymbol = await this._tokenContract.methods.symbol().call();
    const ethBalanceMinimumConfig = await this.configRepository.findOne({where: {key: "minter_min_amount_" + this.currency.network}});
    const ethBalanceMinimum = new BigNumber(ethBalanceMinimumConfig ? ethBalanceMinimumConfig.value : 1);
    if (ethBalance.lt(ethBalanceMinimum)) {
      this.notificationService.notificationLowBalance(this.currency.network, this._addminAddress.address, ethBalance.toString(), this.nativeCoin(this.currency.network));
    }

    if (!this._bridgeContract._address) {
      return;
    }
    const balance = this.convertTokenBalance(await this.getAddressBalance(JSON.parse(this.currency.tokenAddress)["bridge"]), decimals);
    const balanceMinimumConfig = await this.configRepository.findOne({where: {key: "fund_min_amount"}});
    const balanceMinimum = new BigNumber(balanceMinimumConfig ? balanceMinimumConfig.value : 1);
    if (balance.lt(balanceMinimum)) {
      this.notificationService.notificationLowBalance(this.currency.network, JSON.parse(this.currency.tokenAddress)["bridge"], balance.toString(), currencySymbol);
    }
  }

  nativeCoin(chain: string) {
    chain = chain.toLowerCase();
    switch (chain) {
      case "eth":
        return "ETH";
      case "bsc":
        return "BNB";
      case "polygon":
        return "MATIC";

      default:
        return chain.toUpperCase();
    }
  }

  convertTokenBalance(balance: BigNumber, decimals: number) {
    return balance.div(new BigNumber(10).pow(decimals));
  }

  /**
   * Step 1: Get the data from the blockchain
   * @returns {Promise<void>}
   */
  async crawlData() {
    let latestBlockInDb = await this.latestBlockRepository.findOne({currency: this.currency.network});
    const latestBlock = await this._web3.eth.getBlockNumber();

    if (!latestBlockInDb) {
      latestBlockInDb = new LatestBlock();
      latestBlockInDb.currency = this.currency.network;
      latestBlockInDb.blockNumber = latestBlock;
      
      await this.latestBlockRepository.save(latestBlockInDb);
      return false;
    }

    let fromBlock = latestBlockInDb.blockNumber + 1;
    let toBlock = latestBlock - this.currency.requiredConfirmations;
    // max crawl many blocks per time
    if (toBlock > fromBlock + 10) {
      toBlock = fromBlock + 10;
    }
    if (fromBlock <= toBlock) {
      logger.info(`${this.currency.network} WorkerService::crawlData Crawling from block ${fromBlock} => ${toBlock} (lastest block: ${latestBlock})`);
      await this.crawlBlock(fromBlock, toBlock);
    }

    return toBlock - fromBlock > 1;
  }

  async crawlBlock(_fromBlock: number, _toBlock: number) {

    let bridgeEvents = [];
    if (this._bridgeContract._address) {
      bridgeEvents = await this._bridgeContract.getPastEvents('Swap', {
        fromBlock: _fromBlock,
        toBlock: _toBlock
      });
    } 

    let lootboxEvents = [];
    if (this._lootBoxContract._address && this.currency.swapId != 3) {
      lootboxEvents = await this._lootBoxContract.getPastEvents('LootBoxOpened', {
        fromBlock: _fromBlock,
        toBlock: _toBlock
      });
    }

    //insert db
    await getConnection().transaction(async (manager) => {

      // loop events
      for (const bridgeEvent of bridgeEvents) {
        //create new Transaction
        let block = await this._web3.eth.getBlock(bridgeEvent.blockNumber);
        let currencySymbol = await this._tokenContract.methods.symbol().call();
        const transaction = this.transactionRepository.create({
          currency: this._tokenContract._address,
          currencySymbol: currencySymbol,
          status: "pending",
          fromNetwork: this.currency.swapId,
          fromAddress: bridgeEvent.returnValues._from,
          toNetwork: bridgeEvent.returnValues._chainId,
          toAddress: bridgeEvent.returnValues._to,
          type: "swap",
          amount: bridgeEvent.returnValues._amount,
          originTxid: bridgeEvent.transactionHash,
          originBlockNumber: bridgeEvent.blockNumber,
          originBlockHash: bridgeEvent.blockHash,
          originBlockTimestamp: block.timestamp * 1000, 
        });
        await manager.save(transaction);
        logger.info(`${this.currency.network} WorkerService::crawlBlock New event ${JSON.stringify(transaction)}`);
      }

      for (const lootboxEvent of lootboxEvents) {
        //create new Transaction
        let block = await this._web3.eth.getBlock(lootboxEvent.blockNumber);
        const transaction = this.transactionRepository.create({
          currency: "",
          currencySymbol: "Lootbox",
          status: "pending",
          fromNetwork: this.currency.swapId,
          fromAddress: lootboxEvent.returnValues.buyer,
          toNetwork: 3, // polygon
          toAddress: lootboxEvent.returnValues.buyer,
          type: "lootbox",
          amount: JSON.stringify(lootboxEvent.returnValues.issuedNfts),
          originTxid: lootboxEvent.transactionHash,
          originBlockNumber: lootboxEvent.blockNumber,
          originBlockHash: lootboxEvent.blockHash,
          originBlockTimestamp: block.timestamp * 1000, 
        });
        await manager.save(transaction);
        logger.info(`${this.currency.network} WorkerService::crawlBlock New event ${JSON.stringify(transaction)}`);
      }

      // update latest block in transaction
      const latestBlock = await manager.findOne(LatestBlock, {currency: this.currency.network});
      latestBlock.blockNumber = _toBlock;
      await manager.save(latestBlock);
    });
  }


  async constructSwapRawTransaction() {
    const timestamp = new Date().getTime();
    const unsentTransaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: In(["unsigned", "signed"]),
      }
    });

    if (unsentTransaction) {
      // there is a transaction in unsigned or signed status, wait to this transaction to be sent
      return;
    }
    
    const transaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: In(["pending", "failed"]),
        type: "swap",
        retryTimestamp: LessThanOrEqual(timestamp),
      },
      order: {
        createdAt: "ASC",
      }
    });

    if (!transaction) {
      return;
    }

    try {
      let fromAddress = this._addminAddress.address;
      const amount = new BigNumber(transaction.amount);
      let nonce = await this._web3.eth.getTransactionCount(fromAddress);
      let _gasPrice :BigNumber = await this.getGasPrice(false);
  
      /**
       * Workaround for the issue in 2021-06
       * Something went wrong when getting gas price
       * We'll throw error if gas price is not set or zero
       */
      let minGasPrice = new BigNumber(1000000000); // Sometimes gas price is 5wei which is very weird. This set default min gas price is 1 gwei
  
      if (!_gasPrice || !_gasPrice.gt(minGasPrice)) {
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction could not construct tx, invalid gas price: ${
            _gasPrice || _gasPrice.toString()
          }`,
        );
      } else {
        logger.debug(`${this.currency.network} WorkerService::constructRawTransaction gasPrice=${_gasPrice.toString()}`);
      }
  
      const gasPrice = this._web3.utils.toBN(_gasPrice);
  
      let _gasLimit: number;
      // The error can be thrown while gas is being estimated
      try {
        _gasLimit = await this._bridgeContract.methods
          .unlockToken(transaction.toAddress, amount.toString())
          .estimateGas({ from: fromAddress });
      } catch (e) {
        logger.error(
          `${this.currency.network} WorkerService::constructRawTransaction cannot estimate gas for transfer method error=${inspect(
            e,
          )}`,
        );
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction cannot estimate gas for transfer method, error=${e.toString()}`,
        );
      }
  
      if (_gasLimit < 150000) {
        _gasLimit = 150000;
      }
  
      // Fix maximum gas limit is 300,000 to prevent draining attack
      if (_gasLimit > 300000) {
        _gasLimit = 300000;
      }
  
      const gasLimit = this._web3.utils.toBN(_gasLimit);
      const fee = gasLimit.mul(gasPrice);
  
      // Check whether the balance of hot wallet is enough to send
      const ethBalance = this._web3.utils.toBN((await this._web3.eth.getBalance(fromAddress)).toString());
  
      if (ethBalance.lt(fee)) {
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction Could not construct tx because of lacking fee: address=${fromAddress}, fee=${fee}, ethBalance=${ethBalance}`,
        );
      }
  
      const txParams = {
        data: this._bridgeContract.methods.unlockToken(transaction.toAddress, amount.toString()).encodeABI(),
        gasLimit: this._web3.utils.toHex(gasLimit),
        gasPrice: this._web3.utils.toHex(gasPrice),
        nonce: this._web3.utils.toHex(nonce),
        to: JSON.parse(this.currency.tokenAddress)["bridge"],
        value: this._web3.utils.toHex(0)
      };
      
      const tx = new EthereumTx(txParams, { common: this._common });
  
      transaction.unsignedTxid = `0x${tx.hash().toString('hex')}`;
      transaction.unsignedRaw = tx.serialize().toString('hex');
      transaction.feeAmount = gasPrice.toString();
      transaction.retryTimestamp = timestamp;
      transaction.status = "unsigned";
  
      logger.info(`${this.currency.network} WorkerService::constructRawTransaction txParams=${JSON.stringify(txParams)}`);
      
      await this.transactionRepository.save(transaction);
    } catch (e) {
      transaction.errorMessage = e.message;
      transaction.retryTimestamp = timestamp + RETRY_INTERVAL;
      await this.transactionRepository.save(transaction);
      throw e;
    }
  }

  async constructLootBoxRawTransaction() {
    if (this.currency.swapId != 3) {
      return;
    }

    const timestamp = new Date().getTime();
    const unsentTransaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: In(["unsigned", "signed"]),
      }
    });

    if (unsentTransaction) {
      // there is a transaction in unsigned or signed status, wait to this transaction to be sent
      return;
    }
    
    const transaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: In(["pending", "failed"]),
        type: "lootbox",
        retryTimestamp: LessThanOrEqual(timestamp),
      },
      order: {
        createdAt: "ASC",
      }
    });

    if (!transaction) {
      return;
    }

    try {
      let fromAddress = this._addminAddress.address;
      const amount = new BigNumber(transaction.amount);
      let nonce = await this._web3.eth.getTransactionCount(fromAddress);
      let _gasPrice :BigNumber = await this.getGasPrice(false);
  
      /**
       * Workaround for the issue in 2021-06
       * Something went wrong when getting gas price
       * We'll throw error if gas price is not set or zero
       */
      let minGasPrice = new BigNumber(1000000000); // Sometimes gas price is 5wei which is very weird. This set default min gas price is 1 gwei
  
      if (!_gasPrice || !_gasPrice.gt(minGasPrice)) {
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction could not construct tx, invalid gas price: ${
            _gasPrice || _gasPrice.toString()
          }`,
        );
      } else {
        logger.debug(`${this.currency.network} WorkerService::constructRawTransaction gasPrice=${_gasPrice.toString()}`);
      }
  
      const gasPrice = this._web3.utils.toBN(_gasPrice);
  
      let _gasLimit: number;
      // The error can be thrown while gas is being estimated
      let traitsArray = JSON.parse(transaction.amount);
      let addressArray = Array(traitsArray.length).fill(transaction.toAddress);
      try {
        _gasLimit = await this._nftContract.methods
          .batchMint(traitsArray, addressArray)
          .estimateGas({ from: fromAddress });
      } catch (e) {
        logger.error(
          `${this.currency.network} WorkerService::constructRawTransaction cannot estimate gas for transfer method error=${inspect(
            e,
          )}`,
        );
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction cannot estimate gas for transfer method, error=${e.toString()}`,
        );
      }
  
      if (_gasLimit < 150000) {
        _gasLimit = 150000;
      }
  
      // Fix maximum gas limit is 300,000 to prevent draining attack
      if (_gasLimit > 3000000) {
        _gasLimit = 3000000;
      }
  
      const gasLimit = this._web3.utils.toBN(_gasLimit);
      const fee = gasLimit.mul(gasPrice);
  
      // Check whether the balance of hot wallet is enough to send
      const ethBalance = this._web3.utils.toBN((await this._web3.eth.getBalance(fromAddress)).toString());
  
      if (ethBalance.lt(fee)) {
        throw new Error(
          `${this.currency.network} WorkerService::constructRawTransaction Could not construct tx because of lacking fee: address=${fromAddress}, fee=${fee}, ethBalance=${ethBalance}`,
        );
      }
  
      const txParams = {
        data: this._nftContract.methods.batchMint(traitsArray, addressArray).encodeABI(),
        gasLimit: this._web3.utils.toHex(gasLimit),
        gasPrice: this._web3.utils.toHex(gasPrice),
        nonce: this._web3.utils.toHex(nonce),
        to: JSON.parse(this.currency.tokenAddress)["nftToken"],
        value: this._web3.utils.toHex(0)
      };
      
      const tx = new EthereumTx(txParams, { common: this._common });
  
      transaction.unsignedTxid = `0x${tx.hash().toString('hex')}`;
      transaction.unsignedRaw = tx.serialize().toString('hex');
      transaction.feeAmount = gasPrice.toString();
      transaction.retryTimestamp = timestamp;
      transaction.status = "unsigned";
  
      logger.info(`${this.currency.network} WorkerService::constructRawTransaction txParams=${JSON.stringify(txParams)}`);
      
      await this.transactionRepository.save(transaction);
    } catch (e) {
      transaction.errorMessage = e.message;
      transaction.retryTimestamp = timestamp + RETRY_INTERVAL;
      await this.transactionRepository.save(transaction);
      throw e;
    }
  }

  public async getAddressBalance(address: string): Promise<BigNumber> {
    const balance = await this._tokenContract.methods.balanceOf(address).call();
    return new BigNumber(balance.toString());
  }

  public async getGasPrice(useLowerNetworkFee?: boolean): Promise<BigNumber> {
    const baseGasPrice = new BigNumber(await this._web3.eth.getGasPrice());
    
    return baseGasPrice;
  }

  async signRawTransaction() {
    const timestamp = new Date().getTime();
    const transaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: "unsigned",
        retryTimestamp: LessThanOrEqual(timestamp),
      },
      order: {
        createdAt: "ASC",
      }
    });

    if (!transaction) {
      return;
    }

    try {
      const private_key = JSON.parse(this._addminAddress.secret).private_key;
      const kms_data_key_id = JSON.parse(this._addminAddress.secret).kms_data_key_id;
      let secret = await this.kmsService.decrypt(private_key, kms_data_key_id);

      if (secret.startsWith('0x')) {
        secret = secret.substr(2);
      }

      const ethTx = EthereumTx.fromSerializedTx(Buffer.from(transaction.unsignedRaw, 'hex'), { common: this._common });
      const privateKey = Buffer.from(secret, 'hex');
      const signedTx = ethTx.sign(privateKey);

      transaction.txid = `0x${signedTx.hash().toString('hex')}`;
      transaction.signedRaw = signedTx.serialize().toString('hex'),
      transaction.status = "signed";

      logger.info(`${this.currency.network} WorkerService::signRawTransaction transaction=${JSON.stringify(transaction)}`);

      await this.transactionRepository.save(transaction);
    } catch (e) {
      transaction.errorMessage = e.message;
      transaction.retryTimestamp = timestamp + RETRY_INTERVAL;
      await this.transactionRepository.save(transaction);
      throw e;
    }
  }

  async sendRawTransaction(retryCount = 0) {
    const timestamp = new Date().getTime();
    const transaction = await this.transactionRepository.findOne({
      where : {
        toNetwork: this.currency.swapId,
        status: "signed",
        retryTimestamp: LessThanOrEqual(timestamp),
      },
      order: {
        createdAt: "ASC",
      }
    });

    if (!transaction) {
      return;
    }

    let rawTx = transaction.signedRaw;
    const ethTx = EthereumTx.fromSerializedTx(Buffer.from(rawTx, 'hex'), { common: this._common });
    let txid = ethTx.hash().toString('hex');
    if (!txid.startsWith('0x')) {
      txid = '0x' + txid;
    }

    if (!rawTx.startsWith('0x')) {
      rawTx = '0x' + rawTx;
    }

    if (!retryCount || isNaN(retryCount)) {
      retryCount = 0;
    }

    try {
      //send 2 times to be sure
      const [receipt, receipt1] = await Promise.all([
        this._web3.eth.sendSignedTransaction(rawTx),
        this._web3.eth.sendSignedTransaction(rawTx)
      ]);
      logger.info(`${this.currency.network} WorkerService::sendRawTransaction send successfully txid=${txid}`);

      transaction.status = "signed";
      await this.transactionRepository.save(transaction);
      return;
    } catch (e) {
      // Former format of error message when sending duplicate transaction
      if (e.toString().indexOf('known transaction') > -1 || e.toString().indexOf('already known') > -1) {
        logger.info(`${this.currency.network} WorkerService::sendRawTransaction send successfully txid=${txid}`);
        logger.warn(e.toString());
        transaction.status = "sent";
        await this.transactionRepository.save(transaction);
        await this.delay(3000);
        return;
      }

      // The receipt status is failed, but transaction is actually submitted to network successfully
      if (e.toString().indexOf('Transaction has been reverted by the EVM') > -1) {
        logger.warn(e.toString());
        transaction.status = "sent";
        await this.transactionRepository.save(transaction);
        await this.delay(3000);
        return;
      }

      // If `nonce too low` error is returned. Need to double check whether the transaction is confirmed (check in verify method)
      if (e.toString().indexOf('nonce too low') > -1) {
        logger.warn(e.toString());
        transaction.status = "sent";
        await this.transactionRepository.save(transaction);
        await this.delay(3000);
        return;
      }

      if (retryCount + 1 > 5) {
        logger.error(`Too many fails sending txid=${txid} tx=${JSON.stringify(ethTx.toJSON())} err=${e.toString()}`);
        transaction.status = "failed";
        await this.transactionRepository.save(transaction);
        return;
      }

      return this.sendRawTransaction(retryCount + 1);
    }
  }

  async getTransactionStatus() {
    const timestamp = new Date().getTime();
    const sentTransactions = await this.transactionRepository.find({
      where : {
        toNetwork: this.currency.swapId,
        status: "sent",
      }
    });

    if (!sentTransactions || sentTransactions.length === 0) {
      return;
    }
    const lastNetworkBlockNumber = await this._web3.eth.getBlockNumber();

    for (let i = 0; i < sentTransactions.length; i++) {
      const transaction = sentTransactions[i];

      const tx = await this._web3.eth.getTransaction(transaction.txid);
      if (!tx) {
        if (Number(transaction.retryTimestamp) + RETRY_INTERVAL < timestamp) {
          transaction.status = "failed";
          transaction.retryTimestamp = timestamp + RETRY_INTERVAL;
          logger.error(`${this.currency.network} WorkerService::getTransactionStatus confirm failed txid=${transaction.txid}`);
          await this.transactionRepository.save(transaction);
        }
        continue;

      }
  
      const receipt = await this._web3.eth.getTransactionReceipt(transaction.txid)

      if (!tx.blockNumber || (lastNetworkBlockNumber - tx.blockNumber < this.currency.requiredConfirmations)) {
        // confirming...
        break;
      }
  
      if (!receipt.status) {
        transaction.status = "failed";
        transaction.retryTimestamp = timestamp + RETRY_INTERVAL;
        logger.error(`${this.currency.network} WorkerService::getTransactionStatus confirm failed txid=${transaction.txid}`);
        await this.transactionRepository.save(transaction);
      } else {
        let block = await this._web3.eth.getBlock(tx.blockNumber);
        transaction.blockNumber = tx.blockNumber;
        transaction.blockHash = tx.blockHash;
        transaction.blockTimestamp = block.timestamp * 1000;
        transaction.status = "succeed";
        logger.info(`${this.currency.network} WorkerService::getTransactionStatus confirm completed txid=${transaction.txid}`);
        await this.transactionRepository.save(transaction);
      }
    }
  }


}
