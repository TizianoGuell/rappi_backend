import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pedido_detalle')
export class PedidoDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pedido_id' })
  pedidoId: number;

  @Column({ name: 'producto_id' })
  productoId: number;

  @Column()
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'real' })
  precioUnitario: number;
}
