import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
  ParseIntPipe,
  Patch,
  Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrderDto } from './dtos/create-order.dto';
import { IsInt } from 'class-validator';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { getAvailablePaymentMethods } from './payment-method.enum';

class UpdateOrderStatusDto {
  @IsInt()
  estadoId: number;
}

class DriverUpdateStatusDto {
  @IsInt()
  estadoId: number;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('detail/:id')
  async getOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.sub ?? req.user?.id;
    const role = req.user?.role ?? null;
    return this.ordersService.getOrderDetails(Number(userId), id, role);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.ordersService.createFromCart(Number(userId), dto);
  }

  @Post('preview')
  async preview(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return (this.ordersService as any).computeOrderPreview
      ? (this.ordersService as any).computeOrderPreview(Number(userId), dto)
      : { error: 'preview not available' };
  }

  @Get('my')
  async myOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.ordersService.getMyOrders(Number(userId), p, l);
  }

  @Get('vendor')
  @Roles('vendor')
  async vendorOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.ordersService.getVendorOrders(Number(userId), p, l);
  }

  @Patch('vendor/:id/status')
  @Roles('vendor')
  async vendorUpdateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.ordersService.updateOrderStatus(
      Number(userId),
      id,
      dto.estadoId,
    );
  }

  @Get('payment-methods')
  async paymentMethods() {
    return getAvailablePaymentMethods();
  }

  @Get('assignable')
  @Roles('driver')
  async getAssignable(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.ordersService.getAssignableOrders(p, l);
  }

  @Post(':id/assign')
  @Roles('driver')
  async driverAssign(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.ordersService.assignDriver(Number(userId), id);
  }

  @Patch('driver/:id/status')
  @Roles('driver')
  async driverUpdateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DriverUpdateStatusDto,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.ordersService.driverUpdateStatus(
      Number(userId),
      id,
      dto.estadoId,
    );
  }
}
