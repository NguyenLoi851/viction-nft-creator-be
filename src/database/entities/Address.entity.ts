import { Entity, PrimaryColumn, Column, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';
// import Kms from '../encrypt/Kms';

@Entity('address')
export class Address {

  @PrimaryColumn({ name: 'address', type: 'varchar', length: 150 })
  public address: string;

  @Column('text', { name: 'secret', nullable: false })
  public secret: string;

  @Column({ name: 'created_at', type: 'bigint', nullable: true })
  public createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint', nullable: true })
  public updatedAt: number;

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
