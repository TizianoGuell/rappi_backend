import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

@Entity('carrito_detalle')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cart, { nullable: false })
  @JoinColumn({ name: 'carrito_id' })
  carrito: Cart;

  @Column({ name: 'producto_id' })
  productoId: number;

  @Column({ name: 'cantidad' })
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'real' })
  precioUnitario: number;
}
