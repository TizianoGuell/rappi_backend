import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cliente_id' })
  clienteId: number;

  @Column({ name: 'vendor_id', nullable: true })
  vendorId?: number;

  @Column({ name: 'driver_id', nullable: true })
  driverId?: number;

  @CreateDateColumn()
  fecha: Date;

  @Column({ name: 'estado_id', nullable: true })
  estadoId?: number;

  @Column({ name: 'direccion_entrega', type: 'text', nullable: true })
  direccionEntrega?: string;

  @Column({ name: 'metodo_pago_id', nullable: true })
  metodoPagoId?: number;

  @Column({ name: 'numero_seguimiento', nullable: true })
  numeroSeguimiento?: string;

  @Column({ type: 'real', default: 0 })
  total: number;

  @Column({ type: 'real', default: 0 })
  descuento: number;

  @Column({ type: 'real', default: 0 })
  envio: number;

  @Column({ type: 'real', default: 0 })
  impuestos: number;

  @Column({ name: 'restaurant_id', nullable: true })
  restaurantId?: number;
}
