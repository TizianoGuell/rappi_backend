import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { AuthGuard } from '../auth/auth.guard';

/* eslint-disable @typescript-eslint/no-require-imports */
const request = require('supertest');

describe('RestaurantsController (integration)', () => {
  let app: INestApplication;

  const restaurantsServiceMock = {
    create: jest.fn().mockResolvedValue({ id: 1, name: 'R' }),
    findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'R' }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'R' }),
    update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    createMenu: jest.fn().mockResolvedValue({ id: 10, name: 'Menu' }),
    updateMenu: jest.fn().mockResolvedValue({ id: 10, name: 'Menu Updated' }),
    deleteMenu: jest.fn().mockResolvedValue({ deleted: true }),
  } as Partial<RestaurantsService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        { provide: RestaurantsService, useValue: restaurantsServiceMock },
      ],
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

  it('GET /restaurants returns list', async () => {
    const res = await request(app.getHttpServer()).get('/restaurants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'R' }]);
    expect(restaurantsServiceMock.findAll).toHaveBeenCalled();
  });

  it('POST /restaurants creates a restaurant with owner from req.user', async () => {
    const dto = { name: 'R' };
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .send(dto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1 });
    expect(restaurantsServiceMock.create).toHaveBeenCalledWith(dto, 7);
  });

  it('PUT /restaurants/:id passes requesterId to service', async () => {
    const dto = { name: 'Updated' };
    const res = await request(app.getHttpServer())
      .put('/restaurants/1')
      .send(dto);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: 'Updated' });
    expect(restaurantsServiceMock.update).toHaveBeenCalledWith(1, dto, 7);
  });

  it('DELETE /restaurants/:id passes requesterId to service', async () => {
    const res = await request(app.getHttpServer()).delete('/restaurants/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(restaurantsServiceMock.remove).toHaveBeenCalledWith(1, 7);
  });

  it('POST /restaurants/:id/menus passes requesterId to service', async () => {
    const dto = { name: 'Menu', price: 9.99 };
    const res = await request(app.getHttpServer())
      .post('/restaurants/1/menus')
      .send(dto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 10 });
    expect(restaurantsServiceMock.createMenu).toHaveBeenCalledWith(1, dto, 7);
  });

  it('PUT /restaurants/menus/:menuId passes requesterId to service', async () => {
    const dto = { name: 'Menu Updated' };
    const res = await request(app.getHttpServer())
      .put('/restaurants/menus/10')
      .send(dto);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 10 });
    expect(restaurantsServiceMock.updateMenu).toHaveBeenCalledWith(10, dto, 7);
  });

  it('DELETE /restaurants/menus/:menuId passes requesterId to service', async () => {
    const res = await request(app.getHttpServer()).delete(
      '/restaurants/menus/10',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(restaurantsServiceMock.deleteMenu).toHaveBeenCalledWith(10, 7);
  });
});
