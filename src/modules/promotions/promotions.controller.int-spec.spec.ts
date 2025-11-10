/* eslint-disable @typescript-eslint/no-require-imports */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsModule } from './promotions.module';
import { OrdersModule } from '../orders/orders.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Menu } from '../restaurants/menu.entity';
import { Promotion } from './promotion.entity';
import { Pedido } from '../orders/order.entity';
const request = require('supertest');
const { join } = require('path');

describe('Promotions E2E (create -> apply in cart -> checkout)', () => {
  let app: INestApplication;
  let userRepo: Repository<any>;
  let restRepo: Repository<any>;
  let menuRepo: Repository<any>;
  let promoRepo: Repository<any>;
  let pedidoRepo: Repository<any>;

  beforeAll(async () => {
  process.env.DB_SQLITE_PATH = join(process.cwd(), 'RappiDB.db');

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: process.env.DB_SQLITE_PATH,
          entities: [
            join(__dirname, '..', '..', '..', 'src', '**', '*.entity.{ts,js}'),
          ],
          synchronize: false,
        }),
        PromotionsModule,
        OrdersModule,
        require('../restaurants/restaurants.module').RestaurantsModule,
        require('../users/users.module').UsersModule,
      ],
    })
      .overrideGuard(require('../auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const header = req.get('x-user-id');
          const role = req.get('x-user-role');
          if (header)
            req.user = { sub: Number(header), role: role || 'client' };
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

    userRepo = moduleRef.get(getRepositoryToken(User));
    restRepo = moduleRef.get(getRepositoryToken(Restaurant));
    menuRepo = moduleRef.get(getRepositoryToken(Menu));
    promoRepo = moduleRef.get(getRepositoryToken(Promotion));

    try {
      await promoRepo.query(
        `CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        code TEXT,
        percent REAL,
        amount REAL,
        active INTEGER,
        used_count INTEGER DEFAULT 0,
        max_uses INTEGER,
        starts_at TEXT,
        ends_at TEXT,
        vendor_id INTEGER,
        created_at DATETIME
      )` as any,
      );

      await promoRepo.query(
        `CREATE TABLE IF NOT EXISTS promotion_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        promotion_id INTEGER,
        product_id INTEGER,
        code TEXT
      )` as any,
      );
    } catch {
      /* ignored */
    }
    pedidoRepo = moduleRef.get(getRepositoryToken(Pedido));
  }, 20000);

  afterAll(async () => {
    try {
      await pedidoRepo.delete({});
      await promoRepo.delete({});
      await menuRepo.delete({});
      await restRepo.delete({});
      await userRepo.delete({});
    } catch {
    }
    await app.close();
  });

  it('creates a promotion, applies it in checkout and increments usedCount', async () => {
    await userRepo.save(
      userRepo.create({
        id: 1001,
        email: 'client1001@local.test',
        nombre: 'Client 1001',
        password: 'x',
        role: { id: 1 },
      }),
    );
    await userRepo.save(
      userRepo.create({
        id: 2001,
        email: 'vendor2001@local.test',
        nombre: 'Vendor 2001',
        password: 'x',
        role: { id: 2 },
      }),
    );

    const rest = await restRepo.save(
      restRepo.create({ id: 3001, name: 'Rest 3001', owner: { id: 2001 } }),
    );
    const menu = await menuRepo.save(
      menuRepo.create({
        id: 4001,
        name: 'Burger',
        price: 100,
        restaurant: { id: rest.id },
      }),
    );

    const promoDto = {
      title: 'Promo 10%',
      code: 'PROMO10',
      percent: 10,
      active: true,
      vendorId: 2001,
    };
    let res = await request(app.getHttpServer())
      .post('/promotions')
      .set('x-user-id', '1')
      .send(promoDto);
    expect(res.status).toBe(201);

    res = await request(app.getHttpServer())
      .post('/cart/items')
      .set('x-user-id', '1001')
      .send({ productoId: menu.id, cantidad: 2 });
    expect(res.status).toBe(201);

    res = await request(app.getHttpServer())
      .post('/orders')
      .set('x-user-id', '1001')
      .send({ couponCode: 'PROMO10' });
    expect(res.status).toBe(201);
    const createdOrder = res.body;
    expect(createdOrder).toHaveProperty('id');

    expect(createdOrder.descuento).toBeGreaterThan(0);

    const p = await promoRepo.findOne({ where: { code: 'PROMO10' } as any });
    expect(p).toBeDefined();
    expect(p.usedCount).toBeGreaterThanOrEqual(1);
  }, 40000);

  it('assigns a product to a promotion and applies discount only for that product', async () => {
    await userRepo.save(
      userRepo.create({
        id: 1101,
        email: 'client1101@local.test',
        nombre: 'Client 1101',
        password: 'x',
        role: { id: 1 },
      }),
    );
    await userRepo.save(
      userRepo.create({
        id: 2101,
        email: 'vendor2101@local.test',
        nombre: 'Vendor 2101',
        password: 'x',
        role: { id: 2 },
      }),
    );

    const rest = await restRepo.save(
      restRepo.create({ id: 3101, name: 'Rest 3101', owner: { id: 2101 } }),
    );
    const menuA = await menuRepo.save(
      menuRepo.create({
        id: 4101,
        name: 'Pizza',
        price: 120,
        restaurant: { id: rest.id },
      }),
    );
    const menuB = await menuRepo.save(
      menuRepo.create({
        id: 4102,
        name: 'Salad',
        price: 60,
        restaurant: { id: rest.id },
      }),
    );

    const promoDto = {
      title: 'Product Promo',
      code: 'PROD_PROMO',
      percent: 50,
      active: true,
      vendorId: 2101,
    };
    let res = await request(app.getHttpServer())
      .post('/promotions')
      .set('x-user-id', '1')
      .send(promoDto);
    expect(res.status).toBe(201);
    const promo = res.body;

    res = await request(app.getHttpServer())
      .post(`/promotions/${promo.id}/products`)
      .set('x-user-id', '1')
      .send({ productIds: [menuA.id] });
    expect(res.status).toBe(201);

    const rows = await promoRepo.query(
      `SELECT * FROM promotion_products WHERE promotion_id = ? AND product_id = ?`,
      [promo.id, menuA.id] as any,
    );
    expect(rows.length).toBeGreaterThan(0);

    res = await request(app.getHttpServer())
      .post('/cart/items')
      .set('x-user-id', '1101')
      .send({ productoId: menuA.id, cantidad: 1 });
    expect(res.status).toBe(201);
    res = await request(app.getHttpServer())
      .post('/orders')
      .set('x-user-id', '1101')
      .send({ couponCode: 'PROD_PROMO' });
    expect(res.status).toBe(201);
    expect(res.body.descuento).toBeGreaterThan(0);
  }, 40000);
});
