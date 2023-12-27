import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';
import { CollectionType } from 'src/modules/collection/request/type.dto';

@Entity('collection')
export class Collection {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 80})
  name: string;

  @Column({ name: 'symbol', type: 'varchar', length: 80})
  symbol: string;

  @Column({ name: 'description', type: 'varchar', length: 255})
  description: string;

  @Column({ name: 'type', default: CollectionType.Skin })
  type: CollectionType;

  @Column({ name: 'creator', type: 'varchar', length: 80})
  creator: string;

  @Column({ name: 'fileName', type: 'varchar', length: 80})
  fileName: string;

  @Column({ name: 'ipfsMetadataToken', type: 'varchar', length: 80})
  ipfsMetadataToken: string;

  @Column({ name: 'ipfsMetadataUrl', type: 'varchar', length: 255})
  ipfsMetadataUrl: string;

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
