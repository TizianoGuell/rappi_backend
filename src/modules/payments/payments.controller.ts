import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('charge')
  async charge(
    @Body()
    body: {
      userId: number;
      orderId?: number;
      amount: number;
      method?: string | number;
    },
  ) {
    const res = await this.paymentsService.processPayment(
      body.userId,
      body.amount,
      body.method ?? 'card',
    );
    return { ok: true, result: res };
  }

  @Post('webhook')
  async webhook(
    @Body() body: { orderId: number; status: string; transactionId?: string },
  ) {
    if (body.status === 'success' && body.orderId) {
      try {
        await (this.ordersService as any).confirmPayment(
          body.orderId,
          body.transactionId,
        );
      } catch {
        
      }
    }
    return { received: true };
  }
}
