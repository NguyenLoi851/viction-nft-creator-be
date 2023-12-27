import { Entity, Column, BeforeInsert, PrimaryGeneratedColumn, Index } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';

@Entity('mail_log')
@Index('job_id', ['jobId'], { unique: false })
export class MailLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'job_id', type: 'int', nullable: false })
  jobId: number;

  @Column({ name: 'status', type: 'varchar', nullable: true })
  status: string;

  @Column({ name: 'msg', type: 'text', nullable: true })
  msg: string;

  @Column({ name: 'created_at', type: 'bigint', nullable: true })
  createdAt: number;

  @BeforeInsert()
  public updateCreateDates() {
    this.createdAt = nowInMillis();
  }
}
