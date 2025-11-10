import {
  Controller,
  Post,
  Get,
  Req,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Post('availability')
  async toggleAvailability(
    @Req() req: any,
    @Body() body: { available: boolean },
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.toggleAvailability(userId, !!body.available);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Post('position')
  async updatePosition(
    @Req() req: any,
    @Body() body: { lat: number; lng: number },
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.updatePosition(
      userId,
      Number(body.lat),
      Number(body.lng),
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Get('available-orders')
  async availableOrders(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.listAvailableOrders(
      Number(userId),
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Post('orders/:orderId/accept')
  async acceptOrder(
    @Req() req: any,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.acceptOrder(userId, orderId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Post('orders/:orderId/reject')
  async rejectOrder(
    @Req() req: any,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.rejectOrder(userId, orderId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Get('me/history')
  async myHistory(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.getMyHistory(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('driver')
  @Get('me/earnings')
  async earnings(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.driversService.getEarnings(userId);
  }
}
