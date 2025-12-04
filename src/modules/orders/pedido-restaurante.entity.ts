import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pedido_restaurante')
export class PedidoRestaurante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pedido_id' })
  pedidoId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'estado_id', nullable: true })
  estadoId?: number;

  @Column({ type: 'real', default: 0 })
  total: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
