import { Entity, PrimaryColumn, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';

@Entity('kms_cmk')
@Index('region', ['region'], { unique: false })
export class KmsCmk {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 191 })
  id: string;

  @Column({ name: 'region', type: 'varchar', length: 255, nullable: false })
  region: string;

  @Column({ name: 'alias', type: 'varchar', length: 255, default: '', nullable: true })
  alias: string;

  @Column({ name: 'arn', type: 'varchar', length: 255, nullable: false })
  arn: string;

  @Column({ name: 'is_enabled', type: 'tinyint', width: 1, nullable: false, default: 0 })
  isEnabled: boolean;

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
