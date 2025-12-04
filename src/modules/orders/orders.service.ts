import {
  Injectable,
  Optional,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pedido } from './order.entity';
import { PedidoDetalle } from './order-detail.entity';
import { PedidoRestaurante } from './pedido-restaurante.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { mapPaymentMethodToId } from './payment-method.enum';
import { CreateAddressDto } from '../users/dtos/create-address.dto';
import { Cart } from '../cart/cart.entity';
import { CartItem } from '../cart/cart-item.entity';
import { Coupon } from '../promotions/coupon.entity';
import { Address } from '../users/address.entity';
import { Promotion } from '../promotions/promotion.entity';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus, isFinalStatus, getOrderStatusMessage } from './order-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Menu } from '../restaurants/menu.entity';
import { MenuRepository } from '../restaurants/menu.repository';
import { OrdersGateway } from './orders.gateway';
import { DriverPosition } from '../drivers/driver-position.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly detalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly cartService: CartService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,

    @Optional()
    @InjectRepository(PedidoRestaurante)
    private readonly pedidoRestRepo?: Repository<PedidoRestaurante>,

    @Optional() private readonly promotionsService?: PromotionsService,

    private readonly menuRepository?: MenuRepository,
    @Optional()
    @InjectRepository(Promotion)
    private readonly promotionRepo?: Repository<Promotion>,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    @Optional() private readonly ordersGateway?: OrdersGateway,
    @Optional()
    @InjectRepository(DriverPosition)
    private readonly driverPositionRepo?: Repository<DriverPosition>,
  ) {}

  async getVendorSuborders(vendorId: number, page = 1, limit = 20, bypassOwnerCheck = false) {
    if (!this.pedidoRestRepo) return { items: [], total: 0, page, limit };
    const skip = (page - 1) * limit;
    const qb = this.pedidoRestRepo.createQueryBuilder('pr')
      .leftJoin('restaurants', 'r', 'r.id = pr.restaurant_id');

    if (!bypassOwnerCheck) qb.where('r.ownerId = :vendorId', { vendorId });

    qb.orderBy('pr.created_at', 'DESC').limit(limit).offset(skip);

    const items = await qb.getRawMany();

    const totalQ = this.pedidoRestRepo.createQueryBuilder('pr').leftJoin('restaurants', 'r', 'r.id = pr.restaurant_id');
    if (!bypassOwnerCheck) totalQ.where('r.ownerId = :vendorId', { vendorId });
    const total = await totalQ.getCount();
    return { items, total, page, limit };
  }

  async updateSuborderStatus(vendorId: number, suborderId: number, estadoId: number) {
    if (!this.pedidoRestRepo) throw new NotFoundException('Suborder not found');
    const qb = this.pedidoRestRepo.createQueryBuilder('pr')
      .leftJoin('restaurants', 'r', 'r.id = pr.restaurant_id')
      .leftJoin('pedidos', 'p', 'p.id = pr.pedido_id')
      .where('pr.id = :id', { id: suborderId })
      .andWhere('r.ownerId = :vendorId', { vendorId })
      .select(['pr.*', 'p.clienteId as clienteId']);

    const raw = await qb.getRawOne();
    if (!raw) throw new NotFoundException('Suborder not found or not owned by vendor');

    await this.pedidoRestRepo.query(`UPDATE pedido_restaurante SET estado_id = ? WHERE id = ?`, [estadoId, suborderId]);

    try {
      const pedidoId = Number(raw.pedido_id || raw.pedidoId || raw.pr_pedido_id)
      if (pedidoId && Number(estadoId) === OrderStatus.READY) {
        const parent = await this.pedidoRepo.findOne({ where: { id: pedidoId } as any });
        if (parent && Number(parent.estadoId) < OrderStatus.READY) {
          parent.estadoId = OrderStatus.READY;
          await this.pedidoRepo.save(parent as any);
        }
      }
    } catch (e) {
    }

    try {
      const clienteId = raw.clienteId ?? null;
      if (clienteId) {
        await this.notificationsService.createForUser(Number(clienteId), {
          title: `Actualización pedido ${raw.pedido_id}`,
          body: getOrderStatusMessage(Number(estadoId)),
          type: 'order',
          data: { orderId: raw.pedido_id, suborderId: suborderId, status: estadoId },
        } as any);
      }
    } catch (e) {}

    try {
      this.ordersGateway?.emitOrderUpdate(raw.pedido_id, { status: estadoId });
    } catch (e) {}

    return { id: suborderId, estadoId } as any;
  }

  async createFromCart(userId: number, dto: CreateOrderDto) {
    let direccionEntrega = dto.direccionEntrega;
    const newAddr = dto.newAddress;
    if (newAddr) {
      const newAddrRaw: Partial<any> = {
        direccion:
          (newAddr as any).street ??
          (newAddr as any).direccion ??
          (newAddr as any),
        alias: (newAddr as any).alias,
        user: { id: userId },
      };
      const created = this.addressRepo.create(newAddrRaw as any);
      const saved = await this.addressRepo.save(created as any);
      direccionEntrega = saved.direccion ?? direccionEntrega;
    } else if (dto.addressId) {
      const found = await this.addressRepo.findOne({
        where: { id: dto.addressId },
      });
      if (!found) throw new NotFoundException('Address not found');

      const ownerId =
        (found as any).user?.id ?? (found as any).usuario_id ?? null;
      if (ownerId && Number(ownerId) !== Number(userId)) {
        throw new ForbiddenException('Address does not belong to user');
      }
      direccionEntrega = (found as any).direccion ?? direccionEntrega;
    }

    if (this.dataSource) {
      return this.dataSource.transaction(async (manager) => {
        const cartRepo = manager.getRepository(Cart);
        const cartItemRepo = manager.getRepository(CartItem);
        const pedidoRepo = manager.getRepository(Pedido);
        const detalleRepo = manager.getRepository(PedidoDetalle);

        let cart = await cartRepo.findOne({
          where: { usuario_id: userId },
        });
        if (!cart) {
          const newCart = cartRepo.create({
            usuario_id: userId,
          } as Partial<Cart>);
          cart = await cartRepo.save(newCart as any);
        }

        const cartId = cart!.id;
        const items = await cartItemRepo.find({
          where: { carrito: { id: cartId } } as any,
        });

        let subtotal = 0;
        for (const it of items) {
          subtotal += (it as any).precioUnitario * (it as any).cantidad;
        }

        const SHIPPING_FLAT = Number(process.env.SHIPPING_FLAT ?? 50); 
        const TAX_RATE = Number(process.env.TAX_RATE ?? 0.1);

        let discount = 0;
        if (dto.couponCode) {
          const couponRepoTx = manager.getRepository(Coupon);
          const promotionRepoTx = manager.getRepository(
            (this.promotionRepo as any)?.target ?? 'promotions',
          );
          let found: any = null;
          if (couponRepoTx) {
            found = await couponRepoTx.findOne({
              where: { code: dto.couponCode, active: true } as any,
            });
          }
          if (!found) {
            try {
              found = await promotionRepoTx.findOne({
                where: { code: dto.couponCode, active: true } as any,
              });
            } catch (e) {
              found = null;
            }
            if (found) {
              if (found.percent) {
                found.type = 'percent';
                found.value = found.percent;
              } else if (found.amount) {
                found.type = 'amount';
                found.value = found.amount;
              }
            }
          }
          if (found) {
            if (this.promotionRepo && found.id && found.code) {
              const promoDiscount = await (
                this as any
              ).promotionsService?.computeDiscount(
                found,
                subtotal,
                items,
                manager.getRepository(Menu),
              );
              discount = promoDiscount ?? 0;
            } else {
              if (found.type === 'percent')
                discount = subtotal * (found.value / 100);
              else discount = found.value;
            }
            if (discount > subtotal) discount = subtotal;
          }
        }

        const envio = SHIPPING_FLAT;
        const impuestos = (subtotal - discount + envio) * TAX_RATE;

        const total = subtotal - discount + envio + impuestos;

        const metodoPagoIdResolved =
          dto.metodoPagoId ?? mapPaymentMethodToId((dto as any).paymentMethod);

  let vendorIdResolved: number | null = null;
  let restaurantIdResolved: number | null = null;
        if (
          items &&
          items.length > 0 &&
          this.menuRepository &&
          typeof this.menuRepository.findOneById === 'function'
        ) {
          try {
            const firstProduct = items[0] as any;
            const menu = await (this.menuRepository.findOneById as any)(
              firstProduct.productoId,
            );
            if (menu && menu.restaurant) {
              restaurantIdResolved = menu.restaurant.id ?? null;
              if (menu.restaurant.owner) {
                vendorIdResolved = menu.restaurant.owner.id;
              }
            }
          } catch (e) {}
        }

        const pedido = pedidoRepo.create({
          clienteId: userId,
          direccionEntrega: direccionEntrega,
          metodoPagoId: metodoPagoIdResolved,
          total,
          descuento: discount,
          envio,
          impuestos,
          estadoId: 1,
          vendorId: vendorIdResolved ?? null,
          restaurantId: restaurantIdResolved ?? null,
        } as Partial<Pedido>);

        if (this.paymentsService) {
          await this.paymentsService.processPayment(
            userId,
            total,
            metodoPagoIdResolved as any,
          );
        }
        let savedPedido = (await pedidoRepo.save(pedido as any)) as Pedido;

        try {
          const tracking = `TRK-${savedPedido.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          savedPedido.numeroSeguimiento = tracking as any;
          savedPedido = await pedidoRepo.save(savedPedido as any);
        } catch (e) {}

        try {
          if (savedPedido.vendorId) {
            await this.notificationsService.createForUser(
              Number(savedPedido.vendorId),
              {
                title: `Nuevo pedido ${savedPedido.id}`,
                body: `Tienes un nuevo pedido #${savedPedido.id}`,
                type: 'order',
                data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
              } as any,
            );
          }
          if (savedPedido.clienteId) {
            await this.notificationsService.createForUser(
              Number(savedPedido.clienteId),
              {
                title: `Pedido ${savedPedido.id} recibido`,
                body: `Hemos recibido tu pedido #${savedPedido.id}`,
                type: 'order',
                data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
              } as any,
            );
          }
        } catch (e) {}

        try {
          this.ordersGateway?.emitOrderUpdate(savedPedido.id, {
            status: OrderStatus.CREATED,
          });
        } catch (e) {}

        try {
          if (dto.couponCode) {
            const promotionRepoTx = manager.getRepository(
              (this.promotionRepo as any)?.target ?? 'promotions',
            );
            const promo = await promotionRepoTx.findOne({
              where: { code: dto.couponCode, active: true } as any,
            });
            if (promo && typeof promo.usedCount === 'number') {
              promo.usedCount = (promo.usedCount ?? 0) + 1;
              await promotionRepoTx.save(promo);
            }
          }
        } catch (e) {}

        const detalles: Partial<PedidoDetalle>[] = items.map((it: any) => ({
          pedidoId: savedPedido.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario ?? 0,
        }));

        if (typeof (detalleRepo as any).insert === 'function') {
          await (detalleRepo as any).insert(detalles);
        } else {
          await detalleRepo.save(detalles as any);
        }

        try {
          const groups: Map<number, { total: number; ownerId?: number | null }> = new Map();
          if (items && items.length > 0 && this.menuRepository && typeof this.menuRepository.findOneById === 'function') {
            for (const it of items) {
              try {
                const menu = await (this.menuRepository.findOneById as any)(it.productoId);
                const restId = menu?.restaurant?.id ?? menu?.restaurant_id ?? menu?.restaurantId ?? null;
                const ownerId = menu?.restaurant?.owner?.id ?? menu?.restaurant?.ownerId ?? null;
                if (!restId) continue;
                const prev = groups.get(restId) || { total: 0, ownerId: ownerId ?? null };
                prev.total += (Number(it.precioUnitario || 0) * Number(it.cantidad || 0));
                
                if (!prev.ownerId && ownerId) prev.ownerId = ownerId;
                groups.set(restId, prev);
              } catch (e) {
              }
            }
          }

          if (groups.size > 0 && manager) {
            for (const [restaurantId, info] of groups.entries()) {
              try {
                await manager.query(
                  `INSERT INTO pedido_restaurante (pedido_id, restaurant_id, estado_id, total, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
                  [savedPedido.id, restaurantId, 1, info.total],
                );

                let ownerId = info.ownerId ?? null;
                if (!ownerId) {
                  try {
                    const rr: any[] = await manager.query(`SELECT ownerId as ownerId, owner_id as owner_id FROM restaurants WHERE id = ?`, [restaurantId]);
                    if (rr && rr[0]) ownerId = rr[0].ownerId ?? rr[0].owner_id ?? null;
                  } catch (e) {}
                }

                if (ownerId) {
                  try {
                    await this.notificationsService.createForUser(Number(ownerId), {
                      title: `Nuevo pedido ${savedPedido.id}`,
                      body: `Tienes un nuevo pedido #${savedPedido.id}`,
                      type: 'order',
                      data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
                    } as any);
                  } catch (e) {}
                }
              } catch (e) {
              }
            }
          }
        } catch (e) {
        }

        await cartItemRepo
          .createQueryBuilder()
          .delete()
          .where('carrito_id = :id', { id: cartId })
          .execute();

        return savedPedido;
      });
    }

    const { cart, items } = await this.cartService.getCartByUser(userId);

    let subtotal = 0;
    for (const it of items) {
      const precio = (it as any).precioUnitario ?? 0;
      subtotal += precio * (it as any).cantidad;
    }

    const SHIPPING_FLAT = 50;
    const TAX_RATE = 0.1;

    let discount = 0;
    if (dto.couponCode) {
      let found: any = null;
      if (this.couponRepo) {
        found = await this.couponRepo.findOne({
          where: { code: dto.couponCode, active: true } as any,
        });
      }
      if (!found && this.promotionRepo) {
        found = await this.promotionRepo.findOne({
          where: { code: dto.couponCode, active: true } as any,
        });
        if (found) {
          if (found.percent) {
            found.type = 'percent';
            found.value = found.percent;
          } else if (found.amount) {
            found.type = 'amount';
            found.value = found.amount;
          }
        }
      }
      if (found) {
        if (this.promotionRepo && found.id) {
          try {
            const promoDisc = await (
              this as any
            ).promotionsService?.computeDiscount(
              found,
              subtotal,
              items,
              this.menuRepository as any,
            );
            discount = promoDisc ?? 0;
          } catch (e) {
            discount = 0;
          }
        } else {
          if (found.type === 'percent')
            discount = subtotal * (found.value / 100);
          else discount = found.value;
        }
        if (discount > subtotal) discount = subtotal;
      }
    }

    const envio = SHIPPING_FLAT;
    const impuestos = (subtotal - discount + envio) * TAX_RATE;
    const total = subtotal - discount + envio + impuestos;

    const metodoPagoIdResolved =
      dto.metodoPagoId ?? mapPaymentMethodToId((dto as any).paymentMethod);

  let vendorIdResolved: number | null = null;
  let restaurantIdResolved: number | null = null;
    if (
      items &&
      items.length > 0 &&
      this.menuRepository &&
      typeof this.menuRepository.findOneById === 'function'
    ) {
      try {
        const firstProduct = items[0] as any;
        const menu = await (this.menuRepository.findOneById as any)(
          firstProduct.productoId,
        );
        if (menu && menu.restaurant) {
          restaurantIdResolved = menu.restaurant.id ?? null;
          if (menu.restaurant.owner) {
            vendorIdResolved = menu.restaurant.owner.id;
          }
        }
      } catch (e) {}
    }

    const pedido = this.pedidoRepo.create({
      clienteId: userId,
      direccionEntrega: direccionEntrega,
      metodoPagoId: metodoPagoIdResolved,
      total,
      descuento: discount,
      envio,
      impuestos,
      estadoId: 1,
      vendorId: vendorIdResolved ?? null,
      restaurantId: restaurantIdResolved ?? null,
    } as Partial<Pedido>);

    if (this.paymentsService) {
      await this.paymentsService.processPayment(
        userId,
        total,
        metodoPagoIdResolved as any,
      );
    }

    let savedPedido = (await this.pedidoRepo.save(
      pedido as any,
    )) as unknown as Pedido;

    try {
      const tracking = `TRK-${(savedPedido as any).id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      (savedPedido as any).numeroSeguimiento = tracking;
      savedPedido = await this.pedidoRepo.save(savedPedido as any);
    } catch (e) {}

    const detalles: Partial<PedidoDetalle>[] = [];
    for (const it of items) {
      const detalle = {
        pedidoId: savedPedido.id,
        productoId: (it as any).productoId,
        cantidad: (it as any).cantidad,
        precioUnitario: (it as any).precioUnitario ?? 0,
      };
      detalles.push(detalle);
    }

    if (typeof (this.detalleRepo as any).insert === 'function') {
      await (this.detalleRepo as any).insert(detalles);
    } else {
      await this.detalleRepo.save(detalles as any);
    }

    try {
      const groups: Map<number, { total: number; ownerId?: number | null }> = new Map();
      if (items && items.length > 0 && this.menuRepository && typeof this.menuRepository.findOneById === 'function') {
        for (const it of items) {
          try {
            const menu = await (this.menuRepository.findOneById as any)(it.productoId);
            const restId = menu?.restaurant?.id ?? menu?.restaurant_id ?? menu?.restaurantId ?? null;
            const ownerId = menu?.restaurant?.owner?.id ?? menu?.restaurant?.ownerId ?? null;
            if (!restId) continue;
            const prev = groups.get(restId) || { total: 0, ownerId: ownerId ?? null };
            prev.total += (Number(it.precioUnitario || 0) * Number(it.cantidad || 0));
            if (!prev.ownerId && ownerId) prev.ownerId = ownerId;
            groups.set(restId, prev);
          } catch (e) {
          }
        }
      }

      if (groups.size > 0 && this.pedidoRestRepo) {
        for (const [restaurantId, info] of groups.entries()) {
          try {
            await this.pedidoRestRepo.query(
              `INSERT INTO pedido_restaurante (pedido_id, restaurant_id, estado_id, total, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
              [savedPedido.id, restaurantId, 1, info.total],
            );

            let ownerId = info.ownerId ?? null;
            if (!ownerId) {
              try {
                const rr: any[] = await this.pedidoRestRepo.query(`SELECT ownerId as ownerId, owner_id as owner_id FROM restaurants WHERE id = ?`, [restaurantId]);
                if (rr && rr[0]) ownerId = rr[0].ownerId ?? rr[0].owner_id ?? null;
              } catch (e) {}
            }

            if (ownerId) {
              try {
                await this.notificationsService.createForUser(Number(ownerId), {
                  title: `Nuevo pedido ${savedPedido.id}`,
                  body: `Tienes un nuevo pedido #${savedPedido.id}`,
                  type: 'order',
                  data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
                } as any);
              } catch (e) {}
            }
          } catch (e) {
            // continue on failure
          }
        }
      }
    } catch (e) {}

    await this.cartService.clearCart(userId);

    try {
      if ((savedPedido as any).vendorId) {
        await this.notificationsService.createForUser(
          Number((savedPedido as any).vendorId),
          {
            title: `Nuevo pedido ${savedPedido.id}`,
            body: `Tienes un nuevo pedido #${savedPedido.id}`,
            type: 'order',
            data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
          } as any,
        );
      }
      if ((savedPedido as any).clienteId) {
        await this.notificationsService.createForUser(
          Number((savedPedido as any).clienteId),
          {
            title: `Pedido ${savedPedido.id} recibido`,
            body: `Hemos recibido tu pedido #${savedPedido.id}`,
            type: 'order',
            data: { orderId: savedPedido.id, status: OrderStatus.CREATED },
          } as any,
        );
      }
    } catch (e) {}

    try {
      this.ordersGateway?.emitOrderUpdate((savedPedido as any).id, {
        status: OrderStatus.CREATED,
      });
    } catch (e) {}

    try {
      if (dto.couponCode && this.promotionRepo) {
        const promo = await this.promotionRepo.findOne({
          where: { code: dto.couponCode, active: true } as any,
        });
        if (promo && typeof promo.usedCount === 'number') {
          promo.usedCount = (promo.usedCount ?? 0) + 1;
          await this.promotionRepo.save(promo);
        }
      }
    } catch (e) {}

    return savedPedido;
  }

  async getOrderDetails(
    requesterId: number,
    orderId: number,
    role: string | null,
  ) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      Number(order.clienteId) !== Number(requesterId) &&
      Number(order.vendorId) !== Number(requesterId) &&
      Number(order.driverId) !== Number(requesterId)
    ) {
      throw new ForbiddenException('Not allowed to view this order');
    }

    let items: any[] = [];
    try {
      if (this.detalleRepo && typeof this.detalleRepo.find === 'function') {
        items = await this.detalleRepo.find({
          where: { pedidoId: orderId } as any,
        });
      }
    } catch (e) {
      items = [];
    }

    return { ...order, items } as any;
  }

  async computeOrderPreview(userId: number, dto: CreateOrderDto) {
    const { cart, items } = await this.cartService.getCartByUser(userId);
    let subtotal = 0;
    for (const it of items) {
      const precio = (it as any).precioUnitario ?? 0;
      subtotal += precio * (it as any).cantidad;
    }
    const SHIPPING_FLAT = Number(process.env.SHIPPING_FLAT ?? 50);
    const TAX_RATE = Number(process.env.TAX_RATE ?? 0.1);

    let discount = 0;
    if (dto.couponCode) {
      let found: any = null;
      if (this.couponRepo) {
        found = await this.couponRepo.findOne({
          where: { code: dto.couponCode, active: true } as any,
        });
      }
      if (!found && this.promotionRepo) {
        found = await this.promotionRepo.findOne({
          where: { code: dto.couponCode, active: true } as any,
        });
        if (found) {
          if (found.percent) {
            found.type = 'percent';
            found.value = found.percent;
          } else if (found.amount) {
            found.type = 'amount';
            found.value = found.amount;
          }
        }
      }
      if (found) {
        if (this.promotionRepo && found.id) {
          try {
            const promoDisc = await (
              this as any
            ).promotionsService?.computeDiscount(
              found,
              subtotal,
              items,
              this.menuRepository as any,
            );
            discount = promoDisc ?? 0;
          } catch (e) {
            discount = 0;
          }
        } else {
          if (found.type === 'percent')
            discount = subtotal * (found.value / 100);
          else discount = found.value;
        }
        if (discount > subtotal) discount = subtotal;
      }
    }

    const envio = SHIPPING_FLAT;
    const impuestos = (subtotal - discount + envio) * TAX_RATE;
    const total = subtotal - discount + envio + impuestos;
    return { subtotal, discount, envio, impuestos, total };
  }

  async getMyOrders(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.pedidoRepo.findAndCount({
      where: { clienteId: userId } as any,
      order: { fecha: 'DESC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async getVendorOrders(vendorId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.pedidoRepo.findAndCount({
      where: { vendorId: vendorId } as any,
      order: { fecha: 'DESC' } as any,
      take: limit,
      skip,
    } as any);
    return { items, total, page, limit };
  }

  async getAssignableOrders(page = 1, limit = 20, driverId?: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.pedidoRepo.findAndCount({
      where: { driverId: null } as any,
      order: { fecha: 'ASC' } as any,
      take: limit,
      skip,
    } as any);

    if (!driverId || !this.driverPositionRepo)
      return { items, total, page, limit };

    let pos: any = null;
    try {
      pos = await this.driverPositionRepo.findOne({
        where: { driver: { id: driverId } as any },
        order: { createdAt: 'DESC' } as any,
      });
    } catch (e) {
      pos = null;
    }
    if (!pos || typeof pos.lat !== 'number' || typeof pos.lng !== 'number')
      return { items, total, page, limit };

    const haversineKm = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371; // Earth radius km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const RADIUS_KM = Number(process.env.DRIVER_ASSIGN_RADIUS_KM ?? 8);

    const filtered: any[] = [];
    for (const order of items) {
      try {
        const detalles = await this.detalleRepo.find({
          where: { pedidoId: order.id } as any,
        });
        let lat: number | null = null;
        let lng: number | null = null;
        if (
          detalles &&
          detalles.length > 0 &&
          this.menuRepository &&
          typeof this.menuRepository.findOneById === 'function'
        ) {
          const first = detalles[0] as any;
          try {
            const menu = await (this.menuRepository.findOneById as any)(
              first.productoId,
            );
            if (
              menu &&
              menu.restaurant &&
              typeof menu.restaurant.lat === 'number' &&
              typeof menu.restaurant.lng === 'number'
            ) {
              lat = menu.restaurant.lat;
              lng = menu.restaurant.lng;
            }
          } catch (e) {}
        }

        if (lat !== null && lng !== null) {
          const dist = haversineKm(pos.lat, pos.lng, lat, lng);
          if (dist <= RADIUS_KM) filtered.push(order);
        } else {
          filtered.push(order);
        }
      } catch (e) {
        filtered.push(order);
      }
    }

    return { items: filtered, total: filtered.length, page, limit };
  }

  async updateOrderStatus(vendorId: number, orderId: number, estadoId: number) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (Number(order.vendorId) !== Number(vendorId)) {
      throw new ForbiddenException('Not allowed to update this order');
    }
    order.estadoId = estadoId;
    await this.pedidoRepo.save(order as any);

    try {
      this.ordersGateway?.emitOrderUpdate(order.id, { status: estadoId });
    } catch (e) {}
    return order;
  }

  async assignDriver(driverId: number, orderId: number) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId) throw new ForbiddenException('Order already assigned');
    if (isFinalStatus(Number(order.estadoId)))
      throw new ForbiddenException('Cannot assign finalised order');
    // assign driver but do not automatically change the order status to ON_THE_WAY
    // so the driver can explicitly mark it "on the way" when starting delivery.
    order.driverId = driverId;
    await this.pedidoRepo.save(order as any);

    try {
      if (order.vendorId) {
        await this.notificationsService.createForUser(Number(order.vendorId), {
          title: `Pedido ${order.id} asignado a repartidor`,
          body: `El pedido ${order.id} fue aceptado por un repartidor.`,
          type: 'order',
          data: { orderId: order.id, assigned: true },
        } as any);
      }
      if (order.clienteId) {
        await this.notificationsService.createForUser(Number(order.clienteId), {
          title: `Tu pedido ${order.id} fue tomado por un repartidor`,
          body: `Un repartidor ha sido asignado a tu pedido.`,
          type: 'order',
          data: { orderId: order.id, assigned: true },
        } as any);
      }
    } catch (e) {}
    try {
      this.ordersGateway?.emitOrderUpdate(order.id, { assignedTo: driverId, status: order.estadoId });
    } catch (e) {}
    return order;
  }

  async driverUpdateStatus(
    driverId: number,
    orderId: number,
    estadoId: number,
  ) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (Number(order.driverId) !== Number(driverId))
      throw new ForbiddenException('Not allowed to update this order');
    if (isFinalStatus(Number(order.estadoId)))
      throw new ForbiddenException('Cannot update finalised order');
    order.estadoId = estadoId;
    await this.pedidoRepo.save(order as any);

    try {
      if (order.clienteId) {
        await this.notificationsService.createForUser(Number(order.clienteId), {
          title: `Actualización de pedido ${order.id}`,
          body: getOrderStatusMessage(Number(estadoId)),
          type: 'order',
          data: { orderId: order.id, status: estadoId },
        } as any);
      }
      if (order.vendorId) {
        await this.notificationsService.createForUser(Number(order.vendorId), {
          title: `Pedido ${order.id} actualizado`,
          body: `El repartidor actualizó el estado a ${estadoId}.`,
          type: 'order',
          data: { orderId: order.id, status: estadoId },
        } as any);
      }
    } catch (e) {}
    try {
      this.ordersGateway?.emitOrderUpdate(order.id, { status: estadoId });
    } catch (e) {}
    return order;
  }

  async confirmPayment(orderId: number, transactionId?: string) {
    const order = await this.pedidoRepo.findOne({
      where: { id: orderId } as any,
    });
    if (!order) return null;

    if (Number(order.estadoId) === OrderStatus.CREATED) {
      order.estadoId = OrderStatus.PREPARING;

      if (transactionId && !(order as any).numeroSeguimiento) {
        (order as any).numeroSeguimiento = transactionId as any;
      }
      await this.pedidoRepo.save(order as any);
    }
    try {
      this.ordersGateway?.emitOrderUpdate(order.id, {
        status: order.estadoId,
        payment: 'confirmed',
      });
    } catch (e) {}
    return order;
  }
}
