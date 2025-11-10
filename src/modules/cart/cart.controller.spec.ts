import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;

  const cartServiceMock = {
    getCartByUser: jest
      .fn()
      .mockResolvedValue({ id: 1, usuario_id: 1, items: [] }),
    addItem: jest.fn().mockResolvedValue({}),
    updateItem: jest.fn().mockResolvedValue({}),
    removeItem: jest.fn().mockResolvedValue({}),
    clearCart: jest.fn().mockResolvedValue({}),
    getSummary: jest.fn().mockResolvedValue({ items: [] }),
  } as unknown as Partial<CartService>;

  beforeEach(() => {
    controller = new CartController(cartServiceMock as CartService);
  });

  afterEach(() => jest.resetAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getCart returns user cart', async () => {
    const fakeReq: any = { user: { sub: 1 } };

    (cartServiceMock.getCartByUser as any).mockResolvedValueOnce({
      id: 1,
      usuario_id: 1,
      items: [],
    });

    const res = await controller.getCart(fakeReq);

    expect(cartServiceMock.getCartByUser).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ items: [] });
  });

  it('addItem calls service and returns created item', async () => {
    const fakeReq: any = { user: { sub: 1 } };
    const dto = { productoId: 5, cantidad: 2 };
    (cartServiceMock.addItem as any).mockResolvedValueOnce({
      id: 10,
      productoId: 5,
      cantidad: 2,
    });

    (cartServiceMock.getSummary as any).mockResolvedValueOnce({ items: [] });
    const res = await controller.addItem(fakeReq, dto as any);

    expect(cartServiceMock.addItem).toHaveBeenCalledWith(1, dto);

    expect(cartServiceMock.getSummary).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ items: [] });
  });

  it('updateItem updates and returns item', async () => {
    const fakeReq: any = { user: { sub: 1 } };
    const dto = { cantidad: 3 };
    (cartServiceMock.updateItem as any).mockResolvedValueOnce({
      id: 11,
      cantidad: 3,
    });

    (cartServiceMock.getSummary as any).mockResolvedValueOnce({ items: [] });
    const res = await controller.updateItem(fakeReq, '11', dto as any);

    expect(cartServiceMock.updateItem).toHaveBeenCalledWith(1, 11, dto);
    expect(cartServiceMock.getSummary).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ items: [] });
  });

  it('removeItem removes and returns true', async () => {
    const fakeReq: any = { user: { sub: 1 } };
    (cartServiceMock.removeItem as any).mockResolvedValueOnce(true);

    (cartServiceMock.getSummary as any).mockResolvedValueOnce({ items: [] });
    const res = await controller.removeItem(fakeReq, '12');

    expect(cartServiceMock.removeItem).toHaveBeenCalledWith(1, 12);
    expect(cartServiceMock.getSummary).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ items: [] });
  });

  it('clear clears the cart', async () => {
    const fakeReq: any = { user: { sub: 1 } };
    (cartServiceMock.clearCart as any).mockResolvedValueOnce(undefined);

    (cartServiceMock.getSummary as any).mockResolvedValueOnce({ items: [] });
    const res = await controller.clear(fakeReq);

    expect(cartServiceMock.clearCart).toHaveBeenCalledWith(1);
    expect(cartServiceMock.getSummary).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ items: [] });
  });
});
