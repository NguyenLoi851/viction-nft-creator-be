import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';

@Entity('user')
@Index('email', ['email'], { unique: false })
@Index('status', ['status'], { unique: false })
export class User {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'username', type: 'varchar', length: 80, nullable: true, unique: true })
  username: string;

  @Column({ name: 'email', type: 'varchar', length: 191, nullable: false, unique: true })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone: string;

  @Column({ name: 'nationality', type: 'varchar', length: 50, nullable: true })
  nationality: string;

  @Column({ name: 'country', type: 'varchar', length: 50, nullable: true })
  country: string;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @Column({ name: 'state', type: 'varchar', length: 50, nullable: true })
  state: string;

  @Column({ name: 'city', type: 'varchar', length: 50, nullable: true })
  city: string;

  @Column({ name: 'street1', type: 'varchar', length: 255, nullable: true })
  street1: string;

  @Column({ name: 'street2', type: 'varchar', length: 255, nullable: true })
  street2: string;

  @Column({ name: 'created_at', type: 'bigint', nullable: true })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint', nullable: true })
  updatedAt: number;

  @Column({ name: 'nonce', type: 'int', nullable: false, default: 0 })
  nonce: number;

  @Column({ name: 'is_active_2fa', type: 'tinyint', width: 1, nullable: false, default: 0 })
  public isActive2fa: boolean;

  @Column({ name: 'two_factor_authentication_secret', type: 'varchar', length: 100, nullable: true })
  twoFactorAuthenticationSecret: string;

  @Column({ name: 'status_kyc', type: 'varchar', length: 50, nullable: false, default: 'none' })
  public statusKyc: string;

  @Column({ name: 'wallet', type: 'varchar', length: 255, nullable: true })
  wallet: string;

  @Column({ name: 'status', type: 'varchar', length: 25, nullable: true, default: 'request' })
  status: string;

  @Column({ name: 'token', type: 'varchar', length: 255, nullable: true })
  token: string;

  @Column({ name: 'data', type: 'text', nullable: true })
  data: string;

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
