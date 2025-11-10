import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../orders/order.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
  ) {}

  async getAvailableDeliveries() {
    return this.pedidoRepo.find({
      where: { driverId: null } as any,
      order: { fecha: 'ASC' } as any,
    });
  }

  async acceptDelivery(driverId: number, orderId: number) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId) throw new ForbiddenException('Order already assigned');
    order.driverId = driverId;

    order.estadoId = order.estadoId ? order.estadoId : 1;
    await this.pedidoRepo.save(order as any);
    return order;
  }

  async updateStatus(driverId: number, orderId: number, estadoId: number) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (Number(order.driverId) !== Number(driverId))
      throw new ForbiddenException('Not assigned to this driver');
    order.estadoId = estadoId;
    await this.pedidoRepo.save(order as any);
    return order;
  }
}
