import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';

/* eslint-disable @typescript-eslint/no-require-imports */
const request = require('supertest');

describe('OrdersController (integration)', () => {
  let app: INestApplication;

  const ordersServiceMock = {
    createFromCart: jest.fn().mockResolvedValue({ id: 100, total: 200 }),
    getMyOrders: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    getVendorOrders: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    updateOrderStatus: jest.fn().mockResolvedValue({ id: 100, estadoId: 2 }),
    getOrderDetails: jest
      .fn()
      .mockResolvedValue({ id: 100, clienteId: 1, vendorId: 50 }),
  } as Partial<OrdersService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();

          req.user = { sub: 1, role: 'client' };
          return true;
        },
      })
      .overrideGuard(require('../../common/guards/roles.guard').RolesGuard)
      .useValue({
        canActivate: (context: any) => true,
      })
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

  it('POST /orders with newAddress creates order', async () => {
    const dto = { newAddress: { street: 'Main St', alias: 'Casa' } };
    const res = await request(app.getHttpServer()).post('/orders').send(dto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 100 });
    expect(ordersServiceMock.createFromCart).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ newAddress: expect.any(Object) }),
    );
  });

  it('POST /orders with addressId creates order', async () => {
    const dto = { addressId: 5 };
    const res = await request(app.getHttpServer()).post('/orders').send(dto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 100 });
    expect(ordersServiceMock.createFromCart).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ addressId: 5 }),
    );
  });

  it('GET /orders/my returns paginated orders', async () => {
    const res = await request(app.getHttpServer()).get('/orders/my');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0 });
    expect(ordersServiceMock.getMyOrders).toHaveBeenCalledWith(1, 1, 20);
  });

  it('GET /orders/vendor returns vendor orders when role=vendor', async () => {
    await app.close();
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: 50, role: 'vendor' };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const res = await request(app.getHttpServer()).get('/orders/vendor');
    expect(res.status).toBe(200);
    expect(ordersServiceMock.getVendorOrders).toHaveBeenCalledWith(50, 1, 20);
  });

  it('PATCH /orders/vendor/:id/status updates status (vendor)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/orders/vendor/100/status')
      .send({ estadoId: 2 });
    expect(res.status).toBe(200);
    expect(ordersServiceMock.updateOrderStatus).toHaveBeenCalledWith(
      50,
      100,
      2,
    );
    expect(res.body).toMatchObject({ id: 100, estadoId: 2 });
  });

  it('GET /orders/payment-methods returns available methods', async () => {
    const res = await request(app.getHttpServer()).get(
      '/orders/payment-methods',
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((m: any) => m.key === 'CARD')).toBeDefined();
  });

  it('GET /orders/detail/:id returns order details for owner', async () => {
    const res = await request(app.getHttpServer()).get('/orders/detail/100');
    expect(res.status).toBe(200);

    expect(ordersServiceMock.getOrderDetails).toHaveBeenCalledWith(
      50,
      100,
      'vendor',
    );
  });
});
