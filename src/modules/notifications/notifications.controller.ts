import {
  Controller,
  UseGuards,
  Req,
  Get,
  Patch,
  Param,
  Delete,
  Post,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateNotificationDto } from './dtos/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async list(@Req() req: any) {
    return this.notifService.listForUser(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.notifService.countUnreadForUser(req.user.sub);
    return { unread: count };
  }

  @UseGuards(AuthGuard)
  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    return this.notifService.markAsRead(req.user.sub, Number(id));
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.notifService.remove(req.user.sub, Number(id));
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: CreateNotificationDto) {
    const targetUserId = body.userId ?? (req.user && req.user.sub);
    if (!targetUserId) {
      throw new ForbiddenException('target user id could not be determined');
    }

    const requesterRole = req.user && req.user.role;
    if (body.userId && requesterRole !== 'admin') {
      throw new ForbiddenException(
        'only admin can create notifications for other users',
      );
    }

    return this.notifService.createForUser(Number(targetUserId), body as any);
  }
}
