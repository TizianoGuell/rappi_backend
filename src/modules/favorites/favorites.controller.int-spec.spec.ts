import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/auth.guard';
const request = require('supertest');

describe('FavoritesController (integration)', () => {
  let app: INestApplication;

  const favServiceMock = {
    add: jest.fn().mockResolvedValue({ id: 1 }),
    list: jest.fn().mockResolvedValue([{ id: 1, restaurant: { id: 2 } }]),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
  } as Partial<FavoritesService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [{ provide: FavoritesService, useValue: favServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: 7 };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => await app.close());

  it('POST /favorites/:restaurantId calls service.add', async () => {
    const res = await request(app.getHttpServer()).post('/favorites/2');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1 });
    expect(favServiceMock.add).toHaveBeenCalledWith(7, 2);
  });

  it('GET /favorites returns list', async () => {
    const res = await request(app.getHttpServer()).get('/favorites');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, restaurant: { id: 2 } }]);
    expect(favServiceMock.list).toHaveBeenCalledWith(7);
  });

  it('DELETE /favorites/:id deletes favorite', async () => {
    const res = await request(app.getHttpServer()).delete('/favorites/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(favServiceMock.remove).toHaveBeenCalledWith(7, 1);
  });
});
