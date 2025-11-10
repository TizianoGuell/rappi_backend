import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CommissionService } from './commission.service';
import { VendorProfileService } from './vendor-profile.service';
import { ReportsModule } from '../reports/reports.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../orders/order.entity';

@Module({
  imports: [
    ReportsModule,
    RestaurantsModule,
    TypeOrmModule.forFeature([Pedido]),
  ],
  controllers: [AdminController],
  providers: [CommissionService, VendorProfileService],
  exports: [CommissionService, VendorProfileService],
})
export class AdminModule {}
