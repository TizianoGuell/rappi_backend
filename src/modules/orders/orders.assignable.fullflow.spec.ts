import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Pedido } from './order.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const request = require('supertest');
const { join } = require('path');

describe('Orders full driver flow (integration)', () => {
  let app: INestApplication;
  let pedidoRepo: Repository<any>;
  let notifRepo: Repository<any>;
  let userRepo: Repository<any>;

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
        OrdersModule,
        NotificationsModule,
      ],
    })
      .overrideGuard(require('../auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const header = req.get('x-user-id');
          if (header) req.user = { sub: Number(header), role: 'driver' };
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

    pedidoRepo = moduleRef.get(getRepositoryToken(Pedido));
    notifRepo = moduleRef.get(getRepositoryToken(Notification));
    userRepo = moduleRef.get(getRepositoryToken(User));
  }, 20000);

  afterAll(async () => {
    try {
      await notifRepo.delete({});
      await pedidoRepo.delete({});
    } catch (e) {}
    await app.close();
  });

  it('assign then driver updates status -> notifications persisted for each event', async () => {
    await userRepo.save(
      userRepo.create({
        id: 41,
        email: 'client41@local.test',
        nombre: 'Client 41',
        password: 'x',
        role: { id: 1 },
      }),
    );
    await userRepo.save(
      userRepo.create({
        id: 51,
        email: 'vendor51@local.test',
        nombre: 'Vendor 51',
        password: 'x',
        role: { id: 2 },
      }),
    );

    const order = await pedidoRepo.save(
      pedidoRepo.create({
        clienteId: 41,
        vendorId: 51,
        driverId: null,
        estadoId: 1,
        total: 20,
      } as any),
    );

    const beforeVendor = await notifRepo.count({
      where: { user: { id: 51 } as any } as any,
    });
    const beforeClient = await notifRepo.count({
      where: { user: { id: 41 } as any } as any,
    });

    let res = await request(app.getHttpServer())
      .post(`/orders/${order.id}/assign`)
      .set('x-user-id', '900')
      .send();
    expect(res.status).toBe(201);

    const afterAssignVendor = await notifRepo.count({
      where: { user: { id: 51 } as any } as any,
    });
    const afterAssignClient = await notifRepo.count({
      where: { user: { id: 41 } as any } as any,
    });
    expect(afterAssignVendor).toBeGreaterThan(beforeVendor);
    expect(afterAssignClient).toBeGreaterThan(beforeClient);

    res = await request(app.getHttpServer())
      .patch(`/orders/driver/${order.id}/status`)
      .set('x-user-id', '900')
      .send({ estadoId: 5 });
    expect(res.status).toBe(200);

    const afterStatusVendor = await notifRepo.count({
      where: { user: { id: 51 } as any } as any,
    });
    const afterStatusClient = await notifRepo.count({
      where: { user: { id: 41 } as any } as any,
    });

    expect(afterStatusVendor).toBeGreaterThanOrEqual(afterAssignVendor);
    expect(afterStatusClient).toBeGreaterThanOrEqual(afterAssignClient);
  }, 40000);
});
