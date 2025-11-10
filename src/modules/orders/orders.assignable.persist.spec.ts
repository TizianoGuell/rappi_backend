import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Pedido } from './order.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Role } from '../auth/role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const request = require('supertest');
const { join } = require('path');

describe('OrdersController -> persistence notifications (integration)', () => {
  let app: INestApplication;
  let pedidoRepo: Repository<any>;
  let notifRepo: Repository<any>;
  let userRepo: Repository<any>;
  let roleRepo: Repository<any>;

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

          req.user = { sub: 999, role: 'driver' };
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

  it('POST /orders/:id/assign creates persistent notifications for vendor and client', async () => {
    const clientRows = await pedidoRepo.query(
      "SELECT id FROM roles WHERE nombre = 'client'",
    );
    const vendorRows = await pedidoRepo.query(
      "SELECT id FROM roles WHERE nombre = 'vendor'",
    );
    const clientRoleId = clientRows && clientRows[0] ? clientRows[0].id : 1;
    const vendorRoleId =
      vendorRows && vendorRows[0] ? vendorRows[0].id : clientRoleId;

    await userRepo.save(
      userRepo.create({
        id: 21,
        email: 'client21@local.test',
        nombre: 'Client 21',
        password: 'x',
        role: { id: clientRoleId },
      } as any),
    );
    await userRepo.save(
      userRepo.create({
        id: 31,
        email: 'vendor31@local.test',
        nombre: 'Vendor 31',
        password: 'x',
        role: { id: vendorRoleId },
      } as any),
    );

    const created = await pedidoRepo.save(
      pedidoRepo.create({
        clienteId: 21,
        vendorId: 31,
        driverId: null,
        estadoId: 1,
        total: 10,
      } as any),
    );

    const res = await request(app.getHttpServer())
      .post(`/orders/${created.id}/assign`)
      .send();
    expect(res.status).toBe(201);

    const vendorNotifs = await notifRepo.find({
      where: { user: { id: 31 } as any } as any,
    });
    const clientNotifs = await notifRepo.find({
      where: { user: { id: 21 } as any } as any,
    });

    expect(vendorNotifs.length).toBeGreaterThanOrEqual(1);
    expect(clientNotifs.length).toBeGreaterThanOrEqual(1);
  }, 20000);
});
