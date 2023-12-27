import { nowInMillis } from '../../shared/Utils';
import { Entity, PrimaryColumn, Column, BeforeUpdate, BeforeInsert } from 'typeorm';

@Entity('latest_block')
export class LatestBlock {
  @PrimaryColumn()
  public currency: string;

  @Column({ name: 'block_number', nullable: false })
  public blockNumber: number;

  @Column({ name: 'created_at', type: 'bigint' })
  public createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
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
