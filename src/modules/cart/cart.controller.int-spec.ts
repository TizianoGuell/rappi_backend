import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

const request = require('supertest');
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthGuard } from '../auth/auth.guard';

describe('CartController (integration)', () => {
  let app: INestApplication;

  const cartServiceMock = {
    getCartByUser: jest
      .fn()
      .mockResolvedValue({ cart: { id: 1, usuario_id: 1 }, items: [] }),
    addItem: jest
      .fn()
      .mockResolvedValue({ id: 10, productoId: 5, cantidad: 2 }),
    updateItem: jest.fn().mockResolvedValue({ id: 11, cantidad: 3 }),
    removeItem: jest.fn().mockResolvedValue(true),
    clearCart: jest.fn().mockResolvedValue(undefined),
  } as Partial<CartService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cartServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();

          req.user = { sub: 1 };
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

  afterAll(async () => {
    await app.close();
  });

  it('GET /cart returns cart', async () => {
    const res = await request(app.getHttpServer()).get('/cart');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [] });
    expect(cartServiceMock.getCartByUser).toHaveBeenCalledWith(1);
  });

  it('POST /cart/items adds item', async () => {
    const dto = { productoId: 5, cantidad: 2 };
    const res = await request(app.getHttpServer())
      .post('/cart/items')
      .send(dto);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 10, productoId: 5 });
    expect(cartServiceMock.addItem).toHaveBeenCalledWith(1, dto);
  });

  it('PUT /cart/items/:id updates item', async () => {
    const dto = { cantidad: 3 };
    const res = await request(app.getHttpServer())
      .put('/cart/items/11')
      .send(dto);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 11, cantidad: 3 });
    expect(cartServiceMock.updateItem).toHaveBeenCalledWith(1, 11, dto);
  });

  it('DELETE /cart/items/:id removes item', async () => {
    const res = await request(app.getHttpServer()).delete('/cart/items/12');
    expect(res.status).toBe(200);
    expect(res.body).toBe(true);
    expect(cartServiceMock.removeItem).toHaveBeenCalledWith(1, 12);
  });

  it('DELETE /cart clears cart', async () => {
    const res = await request(app.getHttpServer()).delete('/cart');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
    expect(cartServiceMock.clearCart).toHaveBeenCalledWith(1);
  });
});
