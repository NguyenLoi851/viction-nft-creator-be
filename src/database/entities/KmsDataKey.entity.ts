import { nowInMillis } from '../../shared/Utils';
import { Entity, PrimaryGeneratedColumn, Column, BeforeUpdate, BeforeInsert } from 'typeorm';

@Entity('kms_data_key')
export class KmsDataKey {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint', unsigned: true })
  public id: number;

  @Column({ name: 'cmk_id', type: 'varchar', nullable: false })
  public cmkId: string;

  @Column({ name: 'encrypted_data_key', type: 'varchar', length: 500, nullable: false })
  public encryptedDataKey: string;

  @Column({ type: 'tinyint', width: 1, name: 'is_enabled', nullable: false, default: true })
  public isEnabled: number;

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
