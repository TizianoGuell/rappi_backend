import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { Pedido } from './order.entity';
import { PedidoDetalle } from './order-detail.entity';
import { CartModule } from '../cart/cart.module';
import { forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { Address } from '../users/address.entity';
import { Coupon } from '../promotions/coupon.entity';
import { Promotion } from '../promotions/promotion.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { Menu } from '../restaurants/menu.entity';
import { MenuRepository } from '../restaurants/menu.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      PedidoDetalle,
      Address,
      Coupon,
      Promotion,
      Menu,
      require('../drivers/driver-position.entity').DriverPosition,
    ]),
    CartModule,

    forwardRef(() => PaymentsModule),
    NotificationsModule,
    PromotionsModule,
  ],
  providers: [OrdersService, MenuRepository, OrdersGateway],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
