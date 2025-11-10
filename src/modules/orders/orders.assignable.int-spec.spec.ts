import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const request = require('supertest');

describe('OrdersController (assignable endpoint)', () => {
  let app: INestApplication;

  const ordersServiceMock = {
    getAssignableOrders: jest
      .fn()
      .mockResolvedValue({ items: [{ id: 1 }], total: 1, page: 1, limit: 20 }),
  } as Partial<OrdersService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersServiceMock }],
    })
      .overrideGuard(require('../auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();

          req.user = { sub: 77, role: 'driver' };
          return true;
        },
      })
      .overrideGuard(require('../../common/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: (context: any) => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /orders/assignable returns list for drivers', async () => {
    const res = await request(app.getHttpServer()).get('/orders/assignable');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [{ id: 1 }], total: 1 });
    expect(ordersServiceMock.getAssignableOrders).toHaveBeenCalledWith(1, 20);
  });
});
