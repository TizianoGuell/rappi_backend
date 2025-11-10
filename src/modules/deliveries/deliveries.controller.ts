import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AcceptDeliveryDto } from './dtos/accept-delivery.dto';
import { UpdateDeliveryStatusDto } from './dtos/update-delivery-status.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('available')
  @Roles('driver')
  async available() {
    return this.deliveriesService.getAvailableDeliveries();
  }

  @Post('accept')
  @Roles('driver')
  async accept(@Req() req: any, @Body() dto: AcceptDeliveryDto) {
    const driverId = req.user?.sub ?? req.user?.id;
    return this.deliveriesService.acceptDelivery(Number(driverId), dto.orderId);
  }

  @Patch(':id/status')
  @Roles('driver')
  async updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    const driverId = req.user?.sub ?? req.user?.id;
    return this.deliveriesService.updateStatus(
      Number(driverId),
      id,
      dto.estadoId,
    );
  }
}
