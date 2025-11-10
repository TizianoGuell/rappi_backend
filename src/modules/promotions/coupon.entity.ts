import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: false })
  type: string;

  @Column({ type: 'real', default: 0 })
  value: number;

  @Column({ default: true })
  active: boolean;
}
