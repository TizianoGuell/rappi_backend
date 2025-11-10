import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversModule } from '../drivers.module';
import { OrdersModule } from '../../orders/orders.module';
import { RestaurantsModule } from '../../restaurants/restaurants.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const request = require('supertest');
const { join } = require('path');

describe('Drivers geo-filtering (integration)', () => {
  let app: INestApplication;
  let moduleRef: any;
  let pedidoRepo: Repository<any>;
  let detalleRepo: Repository<any>;
  let menuRepo: Repository<any>;
  let restaurantRepo: Repository<any>;

  beforeAll(async () => {
    process.env.DB_SQLITE_PATH = join(process.cwd(), 'RappiDB.db');

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: process.env.DB_SQLITE_PATH,
          entities: [
            join(
              __dirname,
              '..',
              '..',
              '..',
              '..',
              'src',
              '**',
              '*.entity.{ts,js}',
            ),
          ],
          synchronize: false,
        }),
        DriversModule,
        OrdersModule,
        RestaurantsModule,
        NotificationsModule,
      ],
    })
      .overrideGuard(require('../../auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const header = req.get('x-user-id');
          if (header) req.user = { sub: Number(header), role: 'driver' };
          return true;
        },
      })
      .overrideGuard(require('../../../common/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: (context: any) => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const Pedido = require('../../orders/order.entity').Pedido;
    const PedidoDetalle =
      require('../../orders/order-detail.entity').PedidoDetalle;
    const Menu = require('../../restaurants/menu.entity').Menu;
    const Restaurant =
      require('../../restaurants/restaurant.entity').Restaurant;
    const User = require('../../users/user.entity').User;

    pedidoRepo = moduleRef.get(getRepositoryToken(Pedido));
    detalleRepo = moduleRef.get(getRepositoryToken(PedidoDetalle));
    menuRepo = moduleRef.get(getRepositoryToken(Menu));
    restaurantRepo = moduleRef.get(getRepositoryToken(Restaurant));
    const userRepo = moduleRef.get(getRepositoryToken(User));

    try {
      await userRepo.save(
        userRepo.create({
          id: 5000,
          email: 'vendor5000@local.test',
          nombre: 'Vendor 5000',
          password: 'x',
        }),
      );
    } catch (e) {}

    try {
      await userRepo.save(
        userRepo.create({
          id: 7777,
          email: 'driver7777@local.test',
          nombre: 'Driver 7777',
          password: 'x',
        }),
      );
    } catch (e) {}
  }, 20000);

  afterAll(async () => {
    try {
      await detalleRepo.delete({});
      await pedidoRepo.delete({});
    } catch (e) {}
    await app.close();
  });

  it('returns only nearby orders for a driver within radius', async () => {
    const vendorId = 5000;
    const near = await restaurantRepo.save(
      restaurantRepo.create({
        name: 'Near Resto',
        owner: { id: vendorId },
        lat: -34.6,
        lng: -58.37,
      }),
    );
    const far = await restaurantRepo.save(
      restaurantRepo.create({
        name: 'Far Resto',
        owner: { id: vendorId },
        lat: -35.6,
        lng: -59.37,
      }),
    );

    const menuNear = await menuRepo.save(
      menuRepo.create({
        id: 9001,
        name: 'Near Item',
        price: 10,
        restaurant: near,
      }),
    );
    const menuFar = await menuRepo.save(
      menuRepo.create({
        id: 9002,
        name: 'Far Item',
        price: 12,
        restaurant: far,
      }),
    );

    const order1 = await pedidoRepo.save(
      pedidoRepo.create({
        clienteId: 100,
        vendorId: vendorId,
        driverId: null,
        estadoId: 1,
        total: 10,
      }),
    );
    const order2 = await pedidoRepo.save(
      pedidoRepo.create({
        clienteId: 101,
        vendorId: vendorId,
        driverId: null,
        estadoId: 1,
        total: 12,
      }),
    );

    await detalleRepo.save(
      detalleRepo.create({
        pedidoId: order1.id,
        productoId: menuNear.id,
        cantidad: 1,
        precioUnitario: 10,
      }),
    );
    await detalleRepo.save(
      detalleRepo.create({
        pedidoId: order2.id,
        productoId: menuFar.id,
        cantidad: 1,
        precioUnitario: 12,
      }),
    );

    const driverUserId = 7777;
    const res = await request(app.getHttpServer())
      .post('/drivers/position')
      .set('x-user-id', String(driverUserId))
      .send({ lat: -34.6001, lng: -58.3701 });
    expect(res.status).toBe(201);

    const DriverPosition = require('../driver-position.entity').DriverPosition;
    const Driver = require('../driver.entity').Driver;
    const driverRepo = moduleRef.get(getRepositoryToken(Driver));
    const driverPositionRepo = moduleRef.get(
      getRepositoryToken(DriverPosition),
    );
    const createdDriver = await driverRepo.findOne({
      where: { userId: driverUserId } as any,
    });
    if (createdDriver && driverPositionRepo) {
      try {
        await driverPositionRepo.save(
          driverPositionRepo.create({
            driver: { id: createdDriver.id },
            lat: -34.6001,
            lng: -58.3701,
          }),
        );
      } catch (e) {}
    }

    const OrdersService = require('../../orders/orders.service').OrdersService;
    const ordersService = moduleRef.get(OrdersService);
    const result = await ordersService.getAssignableOrders(
      1,
      1000,
      /*driverId=*/ (createdDriver && createdDriver.id) || driverUserId,
    );
    const returnedIds = (result.items || []).map((i: any) => i.id);

    expect(returnedIds).toContain(order1.id);
    expect(returnedIds).not.toContain(order2.id);
  }, 40000);
});
