import { Entity, Column, BeforeInsert, BeforeUpdate, PrimaryGeneratedColumn } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';

@Entity('mail_job')
export class MailJob {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'sender_name', type: 'varchar', length: 100, nullable: true })
  senderName: string;

  @Column({ name: 'sender_address', type: 'varchar', length: 100, nullable: false })
  senderAddress: string;

  @Column({ name: 'recipient_address', type: 'varchar', length: 100, nullable: false })
  recipientAddress: string;

  @Column({ name: 'title', type: 'varchar', length: 254, nullable: true })
  title: string;

  @Column({ name: 'template_name', type: 'varchar', length: 50, nullable: false })
  templateName: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string;

  @Column({ name: 'is_sent', type: 'tinyint', width: 1, nullable: true, default: 0 })
  isSent: boolean;

  @Column({ name: 'retry_count', type: 'tinyint', width: 4, nullable: true, default: 0 })
  retryCount: boolean;

  @Column({ name: 'created_at', type: 'bigint', nullable: true })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint', nullable: true })
  updatedAt: number;

  @BeforeInsert()
  public updateCreateDates() {
    this.createdAt = nowInMillis();
    this.updatedAt = nowInMillis();
  }

  @BeforeUpdate()
  public updateUpdateDates() {
    this.updatedAt = nowInMillis();
  }
}
