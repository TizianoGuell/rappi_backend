import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @UseGuards(AuthGuard)
  @Post('tickets')
  async createTicket(
    @Req() req: any,
    @Body() body: { subject: string; body: string },
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.supportService.createTicket(userId ?? null, body);
  }

  @UseGuards(AuthGuard)
  @Get('tickets')
  async listMyTickets(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.supportService.listForUser(Number(userId));
  }

  @UseGuards(AuthGuard)
  @Get('tickets/:id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getOne(id);
  }
}
