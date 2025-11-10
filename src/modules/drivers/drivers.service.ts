import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { Pedido } from '../orders/order.entity';
import { OrdersService } from '../orders/orders.service';
import { DriverPosition } from './driver-position.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly repo: Repository<Driver>,
    @InjectRepository(Pedido) private readonly ordersRepo: Repository<Pedido>,
    @Optional()
    @Inject(OrdersService)
    private readonly ordersService?: OrdersService,
    @Optional()
    @InjectRepository(DriverPosition)
    private readonly driverPositionRepo?: Repository<DriverPosition>,
  ) {}

  async createOrGetByUser(userId: number) {
    let found = await this.repo.findOne({
      where: { userId } as any,
    });
    if (!found) {
      const toCreate = this.repo.create({
        userId,
        available: false,
      } as Partial<Driver>);
      found = (await this.repo.save(toCreate as any)) as Driver;
    }
    return found;
  }

  async toggleAvailability(userId: number, available: boolean) {
    const drv = await this.createOrGetByUser(userId);
    drv.available = !!available;
    return this.repo.save(drv as any);
  }

  async updatePosition(userId: number, lat: number, lng: number) {
    const drv = await this.createOrGetByUser(userId);

    const saved = await this.repo.save(drv as any);

    try {
      if (this.driverPositionRepo) {
        const pos = this.driverPositionRepo.create({
          driver: { id: saved.id },
          lat,
          lng,
        } as any);
        await this.driverPositionRepo.save(pos as any);
      }
    } catch (e) {}
    return saved;
  }

  async listAvailableOrders(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    let drv: any = null;
    try {
      drv = await this.createOrGetByUser(userId);
    } catch (e) {
      drv = null;
    }

    if (drv && this.ordersService) {
      return this.ordersService.getAssignableOrders(page, limit, drv.id);
    }

    const [items, total] = await this.ordersRepo.findAndCount({
      where: { driverId: null } as any,
      order: { fecha: 'ASC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async acceptOrder(userId: number, orderId: number) {
    const drv = await this.createOrGetByUser(userId);
    const order = await this.ordersRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId) throw new ForbiddenException('Order already assigned');
    order.driverId = drv.id;
    order.estadoId = 4;
    await this.ordersRepo.save(order as any);
    return order;
  }

  async rejectOrder(userId: number, orderId: number) {
    return { rejected: true };
  }

  async getMyHistory(userId: number, page = 1, limit = 20) {
    const drv = await this.createOrGetByUser(userId);
    const skip = (page - 1) * limit;
    const [items, total] = await this.ordersRepo.findAndCount({
      where: { driverId: drv.id } as any,
      order: { fecha: 'DESC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async getEarnings(userId: number) {
    const drv = await this.createOrGetByUser(userId);
    const items = await this.ordersRepo.find({
      where: { driverId: drv.id } as any,
    });

    const shareRate = 0.1;
    let total = 0;
    for (const it of items) {
      total += (Number((it as any).total) || 0) * shareRate;
    }
    return { total, trips: items.length };
  }
}
