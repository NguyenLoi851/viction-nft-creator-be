import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { nowInMillis } from '../../shared/Utils';
import { Role } from '../../modules/admin/request/role.dto';
@Entity('admin')
export class Admin {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'username', type: 'varchar', length: 80, nullable: false, unique: true })
  username: string;

  @Column({ name: 'email', type: 'varchar', length: 191, nullable: false, unique: true })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100, nullable: true })
  fullName: string;

  @Column({ name: 'created_at', type: 'bigint', nullable: true })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint', nullable: true })
  updatedAt: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, nullable: false, default: 0 })
  public isActive: boolean;

  @Column({ name: 'is_active_2fa', type: 'tinyint', width: 1, nullable: false, default: 0 })
  public isActive2fa: boolean;

  @Column({ name: 'two_factor_authentication_secret', type: 'varchar', length: 255, nullable: true })
  twoFactorAuthenticationSecret: string;

  @Column({ name: 'token', type: 'varchar', length: 255, nullable: true })
  public token: string;

  @Column({ name: 'data', type: 'text', nullable: true })
  data: string;

  @Column({ name: 'roles', default: Role.User })
  role: Role;

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
