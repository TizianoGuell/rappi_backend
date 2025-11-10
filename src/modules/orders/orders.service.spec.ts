import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Pedido } from './order.entity';
import { PedidoDetalle } from './order-detail.entity';
import { CartService } from '../cart/cart.service';
import { Coupon } from '../promotions/coupon.entity';
import { Address } from '../users/address.entity';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MenuRepository } from '../restaurants/menu.repository';

describe('OrdersService', () => {
  let service: OrdersService;

  const pedidoRepoMock: Partial<any> = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const detalleRepoMock: Partial<any> = {
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
  };

  const couponRepoMock: Partial<any> = {
    findOne: jest.fn(),
  };

  const addressRepoMock: Partial<any> = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const menuRepoMock: Partial<any> = {
    findOneById: jest.fn(),
  };

  const notificationsServiceMock: Partial<any> = {
    createForUser: jest.fn().mockResolvedValue(true),
  };

  const cartServiceMock: Partial<any> = {
    getCartByUser: jest.fn(),
    clearCart: jest.fn(),
  } as Partial<CartService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PaymentsService,
          useValue: {
            processPayment: jest
              .fn()
              .mockResolvedValue({ success: true, transactionId: 'tx' }),
          },
        },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: MenuRepository, useValue: menuRepoMock },
        { provide: getRepositoryToken(Pedido), useValue: pedidoRepoMock },
        {
          provide: getRepositoryToken(PedidoDetalle),
          useValue: detalleRepoMock,
        },
        { provide: getRepositoryToken(Coupon), useValue: couponRepoMock },
        { provide: getRepositoryToken(Address), useValue: addressRepoMock },
        { provide: CartService, useValue: cartServiceMock },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    (cartServiceMock.getCartByUser as jest.Mock).mockReset();
    (cartServiceMock.clearCart as jest.Mock).mockReset();
    (pedidoRepoMock.create as jest.Mock).mockReset();
    (pedidoRepoMock.save as jest.Mock).mockReset();
    (detalleRepoMock.create as jest.Mock).mockReset();
    (detalleRepoMock.save as jest.Mock).mockReset();
    (detalleRepoMock.insert as jest.Mock).mockReset();
    (couponRepoMock.findOne as jest.Mock).mockReset();
    (addressRepoMock.create as jest.Mock).mockReset();
    (addressRepoMock.save as jest.Mock).mockReset();
    (addressRepoMock.findOne as jest.Mock).mockReset();
    (menuRepoMock.findOneById as jest.Mock).mockReset();
  });

  afterEach(() => jest.resetAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an order from cart', async () => {
    const userId = 1;
    const items = [
      { productoId: 2, cantidad: 2, precioUnitario: 3 },
      { productoId: 3, cantidad: 1, precioUnitario: 5 },
    ];
    cartServiceMock.getCartByUser.mockResolvedValueOnce({
      cart: { id: 1 },
      items,
    });

    (menuRepoMock.findOneById as jest.Mock).mockResolvedValueOnce({
      id: 2,
      restaurant: { owner: { id: 42 } },
    });

    pedidoRepoMock.create.mockImplementation((p: any) => p);
    pedidoRepoMock.save.mockResolvedValue({
      id: 100,
      clienteId: userId,
      total: 11,
      vendorId: 42,
    });

    detalleRepoMock.create.mockImplementation((d: any) => d);
    detalleRepoMock.save.mockResolvedValueOnce(undefined);
    couponRepoMock.findOne.mockResolvedValueOnce(null);

    const res = await service.createFromCart(userId, {} as any);

    expect(cartServiceMock.getCartByUser).toHaveBeenCalledWith(userId);
    expect(pedidoRepoMock.save).toHaveBeenCalled();

    expect(
      (detalleRepoMock.insert as jest.Mock).mock.calls.length > 0 ||
        (detalleRepoMock.save as jest.Mock).mock.calls.length > 0,
    ).toBeTruthy();
    expect(cartServiceMock.clearCart).toHaveBeenCalledWith(userId);
    expect(res).toHaveProperty('id', 100);

    expect(
      (notificationsServiceMock.createForUser as jest.Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(1);
    const calledUserIds = (
      notificationsServiceMock.createForUser as jest.Mock
    ).mock.calls.map((c: any[]) => c[0]);
    expect(calledUserIds).toContain(42);
  });

  it('throws ForbiddenException when using an address that belongs to another user', async () => {
    const userId = 7;
    const items = [{ productoId: 2, cantidad: 1, precioUnitario: 10 }];
    cartServiceMock.getCartByUser.mockResolvedValueOnce({
      cart: { id: 2 },
      items,
    });

    addressRepoMock.findOne.mockResolvedValueOnce({
      id: 99,
      user: { id: 999 },
    });

    await expect(
      service.createFromCart(userId, { addressId: 99 } as any),
    ).rejects.toThrow();
  });

  it('creates an order from cart with percent coupon', async () => {
    const userId = 1;
    const items = [
      { productoId: 2, cantidad: 2, precioUnitario: 3 },
      { productoId: 3, cantidad: 1, precioUnitario: 5 },
    ];
    cartServiceMock.getCartByUser.mockResolvedValueOnce({
      cart: { id: 1 },
      items,
    });

    couponRepoMock.findOne.mockResolvedValueOnce({
      type: 'percent',
      value: 10,
      active: true,
    });

    pedidoRepoMock.create.mockImplementation((p: any) => p);
    pedidoRepoMock.save.mockImplementation(async (p: any) => ({
      ...p,
      id: 200,
    }));

    detalleRepoMock.create.mockImplementation((d: any) => d);
    detalleRepoMock.save.mockResolvedValueOnce(undefined);

    const res = await service.createFromCart(userId, {
      couponCode: 'PROMO10',
    } as any);

    expect(pedidoRepoMock.save).toHaveBeenCalled();
    const savedArg = pedidoRepoMock.save.mock.calls[0][0];

    expect(savedArg).toHaveProperty('descuento');
    expect(typeof savedArg.descuento).toBe('number');
    expect(savedArg.descuento).toBeGreaterThanOrEqual(0);
    expect(savedArg.envio).toBe(50);
    expect(savedArg).toHaveProperty('impuestos');
    expect(typeof savedArg.impuestos).toBe('number');
    expect(res).toHaveProperty('id', 200);
  });

  it('creates an order with paymentMethod string mapped to metodoPagoId', async () => {
    const userId = 1;
    const items = [{ productoId: 2, cantidad: 1, precioUnitario: 10 }];
    cartServiceMock.getCartByUser.mockResolvedValueOnce({
      cart: { id: 1 },
      items,
    });
    couponRepoMock.findOne.mockResolvedValueOnce(null);

    pedidoRepoMock.create.mockImplementation((p: any) => p);
    pedidoRepoMock.save.mockImplementation(async (p: any) => ({
      ...p,
      id: 300,
    }));

    detalleRepoMock.create.mockImplementation((d: any) => d);
    detalleRepoMock.save.mockResolvedValueOnce(undefined);

    const res = await service.createFromCart(userId, {
      paymentMethod: 'CARD',
    } as any);

    expect(pedidoRepoMock.save).toHaveBeenCalled();
    const savedArg = pedidoRepoMock.save.mock.calls[0][0];
    expect(savedArg.metodoPagoId).toBe(2); 
    expect(res).toHaveProperty('id', 300);
  });

  it('assignDriver assigns and notifies vendor and client', async () => {
    const orderId = 500;
    const driverId = 77;
    const existingOrder: any = {
      id: orderId,
      clienteId: 10,
      vendorId: 20,
      driverId: null,
      estadoId: 1,
    };
    (pedidoRepoMock.findOne as jest.Mock) = jest
      .fn()
      .mockResolvedValue(existingOrder);
    (pedidoRepoMock.save as jest.Mock) = jest
      .fn()
      .mockImplementation(async (o: any) => ({ ...existingOrder, ...o }));

    const res = await service.assignDriver(driverId, orderId);
    expect(pedidoRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: orderId } as any,
    });
    expect(pedidoRepoMock.save).toHaveBeenCalled();

    expect(
      (notificationsServiceMock.createForUser as jest.Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      (notificationsServiceMock.createForUser as jest.Mock).mock.calls[0][0],
    ).toBe(20); // vendor
    expect(
      (notificationsServiceMock.createForUser as jest.Mock).mock.calls[1][0],
    ).toBe(10); // client
  });

  it('driverUpdateStatus updates and notifies client/vendor', async () => {
    const orderId = 600;
    const driverId = 88;
    const existingOrder: any = {
      id: orderId,
      clienteId: 11,
      vendorId: 21,
      driverId: driverId,
      estadoId: 4,
    };
    (pedidoRepoMock.findOne as jest.Mock) = jest
      .fn()
      .mockResolvedValue(existingOrder);
    (pedidoRepoMock.save as jest.Mock) = jest
      .fn()
      .mockImplementation(async (o: any) => ({ ...existingOrder, ...o }));

    const res = await service.driverUpdateStatus(driverId, orderId, 5);
    expect(pedidoRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: orderId } as any,
    });
    expect(pedidoRepoMock.save).toHaveBeenCalled();
    expect(
      (notificationsServiceMock.createForUser as jest.Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(1);

    const calledUserIds = (
      notificationsServiceMock.createForUser as jest.Mock
    ).mock.calls.map((c: any[]) => c[0]);
    expect(calledUserIds).toContain(11);
    expect(calledUserIds).toContain(21);
  });

  it('getOrderDetails returns order with items for authorized user', async () => {
    const orderId = 700;
    const requesterId = 11;
    const existingOrder: any = {
      id: orderId,
      clienteId: requesterId,
      vendorId: 21,
      driverId: null,
    };
    (pedidoRepoMock.findOne as jest.Mock) = jest
      .fn()
      .mockResolvedValue(existingOrder);
    (detalleRepoMock.find as jest.Mock) = jest
      .fn()
      .mockResolvedValue([
        { id: 1, pedidoId: orderId, productoId: 5, cantidad: 2 },
      ]);

    const res = await service.getOrderDetails(requesterId, orderId, 'client');
    expect(pedidoRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: orderId } as any,
    });
    expect(detalleRepoMock.find).toHaveBeenCalledWith({
      where: { pedidoId: orderId } as any,
    });
    expect(res).toHaveProperty('items');
    expect(res.items.length).toBeGreaterThanOrEqual(1);
  });

  it('getOrderDetails throws Forbidden for unauthorized user', async () => {
    const orderId = 800;
    const existingOrder: any = {
      id: orderId,
      clienteId: 50,
      vendorId: 60,
      driverId: null,
    };
    (pedidoRepoMock.findOne as jest.Mock) = jest
      .fn()
      .mockResolvedValue(existingOrder);

    await expect(service.getOrderDetails(99, orderId, null)).rejects.toThrow();
  });
});
