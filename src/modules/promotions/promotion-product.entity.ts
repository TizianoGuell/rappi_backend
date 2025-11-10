import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';

@Entity({ name: 'promotion_products' })
export class PromotionProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Promotion, (p) => (p as any).id, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion | any;

  @Column({ name: 'product_id', type: 'integer' })
  productId: number;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code?: string;
}
