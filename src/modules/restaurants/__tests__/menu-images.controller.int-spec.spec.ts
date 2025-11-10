import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsModule } from '../restaurants.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { Restaurant } from '../restaurant.entity';
import { Menu } from '../menu.entity';
import { MenuImage } from '../menu-image.entity';
const request = require('supertest');
const { join } = require('path');
const fs = require('fs');

describe('MenuImages E2E (upload -> persist)', () => {
  let app: INestApplication;
  let userRepo: Repository<any>;
  let restRepo: Repository<any>;
  let menuRepo: Repository<any>;
  let imageRepo: Repository<any>;
  const dbPath = join(process.cwd(), 'RappiDB.db');

  beforeAll(async () => {
    process.env.DB_SQLITE_PATH = dbPath;
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
        RestaurantsModule,
        require('../../users/users.module').UsersModule,
      ],
    })
      .overrideGuard(require('../../auth/auth.guard').AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const header = req.get('x-user-id');
          if (header)
            req.user = {
              sub: Number(header),
              role: req.get('x-user-role') || 'client',
            };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    userRepo = moduleRef.get(getRepositoryToken(User));
    restRepo = moduleRef.get(getRepositoryToken(Restaurant));
    menuRepo = moduleRef.get(getRepositoryToken(Menu));
    imageRepo = moduleRef.get(getRepositoryToken(MenuImage));

    try {
      await imageRepo.query(
        `CREATE TABLE IF NOT EXISTS menu_images (id INTEGER PRIMARY KEY AUTOINCREMENT, menu_id INTEGER, url TEXT, is_primary INTEGER DEFAULT 0, created_at DATETIME)` as any,
      );
      await imageRepo.query(
        `CREATE TABLE IF NOT EXISTS restaurants (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, ownerId INTEGER)` as any,
      );
      await imageRepo.query(
        `CREATE TABLE IF NOT EXISTS menus (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, restaurantId INTEGER)` as any,
      );
      await imageRepo.query(
        `CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, email TEXT, password TEXT, telefono TEXT, rol_id INTEGER)` as any,
      );
    } catch {
    }
  }, 20000);

  afterAll(async () => {
    try {
      await imageRepo.delete({});
      await menuRepo.delete({});
      await restRepo.delete({});
      await userRepo.delete({});
    } catch {
    }

    try {
      fs.unlinkSync(join(process.cwd(), 'uploads', 'menus', 'test-sample.jpg'));
    } catch {
    }
    await app.close();
  });

  it('uploads an image for a menu and persists it', async () => {
    const menu = { id: 7001 };

    const uploadsDir = join(process.cwd(), 'uploads', 'menus');
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {
    }
    const samplePath = join(uploadsDir, 'test-sample.jpg');
    fs.writeFileSync(samplePath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const res = await request(app.getHttpServer())
      .post(`/restaurants/menus/${menu.id}/images`)
      .set('x-user-id', '5001')
      .attach('file', samplePath);
    expect(res.status).toBe(201);
    const created = res.body;
    expect(created).toHaveProperty('id');
    expect(created).toHaveProperty('url');

    const rows = await imageRepo.query(
      `SELECT * FROM menu_images WHERE menu_id = ?`,
      [menu.id] as any,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].url).toContain('/uploads/menus');
  }, 40000);
});
