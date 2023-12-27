import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { getLogger } from '../../shared/logger';

const NOTIFICATION_INTERVAL = 1000 * 60 * 60; // 1 hour
var lastSendTime = {};
const logger = getLogger("NotificationService");
@Injectable()
export class NotificationService {
  constructor(
    private mailService: MailService) {}

  async notificationException(exception: string) {
    let message = this.convertMessage(exception);
    if (message == "") {
      return;
    }
    let now = new Date();
    if (now.getTime() - lastSendTime[message] < NOTIFICATION_INTERVAL) {
      logger.info("Error: " + message);
      return;
    }

    lastSendTime[message] = now.getTime();
    this.mailService.sendNotification(message);
    logger.info("Sent notification: " + message);
  }

  async notificationLowBalance(network: string, address: string, balance: string, token: string) {
    let message = `${network.toLocaleUpperCase()} has low balance (${balance} ${token}). Please add more ${token} to ${address}.`;
    await this.notificationException(message);
  }

  convertMessage(message: string) {
    if (message.indexOf('execution reverted: Invalid amount') >= 0) {
      return message.split(' ')[0].toLocaleUpperCase() + ' does not have enough XP in funding pool to proceed a pending transaction. Please add more XP to funding pool.';
    }
    if (message.indexOf("execution reverted: Only admin") >= 0) {
      return (
        message.split(" ")[0].toLocaleUpperCase() +
        " You have NOT set the admin permission for admin address."
      );
    }
    if (message.indexOf("Could not construct tx because of lacking fee") >= 0) {
      return (
        message.split(" ")[0].toLocaleUpperCase() +
        " Could not construct tx because of lacking fee. Please add more native coin to admin adress."
      );
    }
    return "";
  }
}
