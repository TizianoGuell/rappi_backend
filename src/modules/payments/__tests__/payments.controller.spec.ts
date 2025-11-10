import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import { OrdersService } from '../../orders/orders.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const paymentsMock = {
    processPayment: jest
      .fn()
      .mockResolvedValue({ success: true, transactionId: 'tx1' }),
  } as Partial<PaymentsService>;
  const ordersMock = {
    confirmPayment: jest.fn().mockResolvedValue({ id: 1 }),
  } as Partial<OrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: paymentsMock },
        { provide: OrdersService, useValue: ordersMock },
      ],
    }).compile();
    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('charge returns fake result', async () => {
    const res = await controller.charge({
      userId: 1,
      amount: 100,
      method: 'card',
    });
    expect(paymentsMock.processPayment).toHaveBeenCalledWith(1, 100, 'card');
    expect(res).toHaveProperty('ok', true);
  });

  it('webhook calls orders.confirmPayment on success', async () => {
    const res = await controller.webhook({
      orderId: 10,
      status: 'success',
      transactionId: 'tx1',
    });
    expect(ordersMock.confirmPayment).toHaveBeenCalledWith(10, 'tx1');
    expect(res).toEqual({ received: true });
  });
});
