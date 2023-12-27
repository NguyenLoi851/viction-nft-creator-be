import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';
// import Kms from '../encrypt/Kms';

@Entity('config')
export class Config {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    id: number;

    @Column('varchar', { name: 'key', length: 255, nullable: false, unique: true })
    public key: string;

    @Column({
        name: 'value',
        type: 'decimal',
        precision: 40,
        scale: 8,
        nullable: true,
    })
    public value: string;

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
