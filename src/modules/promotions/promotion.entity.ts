import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'real', nullable: true })
  percent?: number;

  @Column({ type: 'real', nullable: true })
  amount?: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'used_count', type: 'integer', default: 0 })
  usedCount: number;

  @Column({ name: 'max_uses', type: 'integer', nullable: true })
  maxUses?: number;

  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt?: Date;

  @Column({ name: 'vendor_id', nullable: true })
  vendorId?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
