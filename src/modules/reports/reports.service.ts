import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../orders/order.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Pedido) private pedidoRepo: Repository<Pedido>,
  ) {}

  async ordersSummary() {
    const total = await this.pedidoRepo.count();
    const byStatus = await this.pedidoRepo
      .createQueryBuilder('p')
      .select('p.estadoId', 'estadoId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.estadoId')
      .getRawMany();
    return { total, byStatus };
  }

  async salesByVendor() {
    const rows = await this.pedidoRepo
      .createQueryBuilder('p')
      .select('p.vendorId', 'vendorId')
      .addSelect('SUM(p.total)', 'totalSales')
      .groupBy('p.vendorId')
      .getRawMany();
    return rows;
  }
}
