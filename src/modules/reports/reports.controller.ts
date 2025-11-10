import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@UseGuards(AuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('orders-summary')
  @Roles('admin')
  async ordersSummary() {
    return this.reportsService.ordersSummary();
  }

  @Get('sales-by-vendor')
  @Roles('admin')
  async salesByVendor() {
    return this.reportsService.salesByVendor();
  }
}
