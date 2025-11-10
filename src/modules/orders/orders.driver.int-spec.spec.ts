import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/* eslint-disable @typescript-eslint/no-require-imports */
const request = require('supertest');

describe('OrdersController (driver endpoints integration)', () => {
  let app: INestApplication;

  const ordersServiceMock = {
    assignDriver: jest
      .fn()
      .mockImplementation((driverId: number, orderId: number) =>
        Promise.resolve({ id: orderId, driverId, estadoId: 4 }),
      ),
    driverUpdateStatus: jest
      .fn()
      .mockImplementation(
        (driverId: number, orderId: number, estadoId: number) =>
          Promise.resolve({ id: orderId, driverId, estadoId }),
      ),
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

  it('POST /orders/:id/assign allows driver to claim an order', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders/123/assign')
      .send();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 123, driverId: 77, estadoId: 4 });
    expect(ordersServiceMock.assignDriver).toHaveBeenCalledWith(77, 123);
  });

  it('PATCH /orders/driver/:id/status allows assigned driver to update status', async () => {
    const res = await request(app.getHttpServer())
      .patch('/orders/driver/123/status')
      .send({ estadoId: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 123, driverId: 77, estadoId: 5 });
    expect(ordersServiceMock.driverUpdateStatus).toHaveBeenCalledWith(
      77,
      123,
      5,
    );
  });
});
