import {  Controller,  Get,  Post,  Body,  Param,  Put,  Delete,  UseGuards,  Req,  ParseIntPipe, } from '@nestjs/common';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AuthGuard } from '../auth/auth.guard';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { ReportsService } from '../reports/reports.service';
import { CommissionService } from './commission.service';
import { VendorProfileService } from './vendor-profile.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Pedido } from '../orders/order.entity';
import { Repository } from 'typeorm';
import { OrdersService } from '../orders/orders.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly reportsService: ReportsService,
    private readonly commissionService: CommissionService,
    private readonly vendorProfileService: VendorProfileService,
    private readonly ordersService: OrdersService,
    @InjectRepository(Pedido) private readonly pedidoRepo?: Repository<Pedido>,
  ) {}

  @Get('dashboard')
  @Roles('admin')
  async dashboard() {
    const orders = await this.reportsService.ordersSummary();
    const sales = await this.reportsService.salesByVendor();
    return { orders, sales };
  }
  @Get('vendors')
  @Roles('admin')
  async listVendors() {
    return this.restaurantsService.findAll();
  }

  @Post('vendors')
  @Roles('admin')
  async createVendor(@Req() req: any, @Body() dto: any) {
    return this.restaurantsService.create(dto, req.user?.sub);
  }

  @Put('vendors/:id')
  @Roles('admin')
  async updateVendor(
    @Req() req: any,
    @Param('id') id: number,
    @Body() dto: any,
  ) {
    return this.restaurantsService.update(
      Number(id),
      dto,
      req.user?.sub,
      req.user?.role,
    );
  }

  @Delete('vendors/:id')
  @Roles('admin')
  async deleteVendor(@Req() req: any, @Param('id') id: number) {
    return this.restaurantsService.remove(
      Number(id),
      req.user?.sub,
      req.user?.role,
    );
  }
  @Get('vendors/:id/reports')
  @Roles('admin')
  async vendorReports(@Param('id') id: number) {
    if (!this.pedidoRepo) return { count: 0, total: 0 };
    const rows = await this.pedidoRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(p.total)', 'total')
      .where('p.vendorId = :id', { id: Number(id) })
      .getRawOne();
    return rows ?? { count: 0, total: 0 };
  }
  @Get('vendors/:id/commission')
  @Roles('admin')
  async getCommission(@Param('id') id: number) {
    return this.commissionService.getCommission(Number(id));
  }

  @Put('vendors/:id/commission')
  @Roles('admin')
  async setCommission(
    @Param('id') id: number,
    @Body() body: { commission: number },
  ) {
    return this.commissionService.setCommission(
      Number(id),
      Number(body.commission),
    );
  }

  @Get('vendors/:id/profile')
  @Roles('admin', 'vendor')
  async getVendorProfile(@Param('id') id: number) {
    return this.vendorProfileService.getProfile(Number(id));
  }

  @Put('vendors/:id/profile')
  @Roles('admin', 'vendor')
  async setVendorProfile(@Param('id') id: number, @Body() body: any) {
    return this.vendorProfileService.setProfile(Number(id), body);
  }

  @Post('orders/:id/assign-driver')
  @Roles('admin')
  async assignOrderToDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { driverId: number },
  ) {
    const driverId = Number(body.driverId);
    return this.ordersService.assignDriver(driverId, id);
  }
}
