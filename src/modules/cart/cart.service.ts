import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { Menu } from '../restaurants/menu.entity';
import { Coupon } from '../promotions/coupon.entity';
import { Promotion } from '../promotions/promotion.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Menu)
    private menuRepo: Repository<Menu>,
    @Optional()
    @InjectRepository(Coupon)
    private couponRepo?: Repository<Coupon>,
    @Optional()
    @InjectRepository(Promotion)
    private promotionRepo?: Repository<any>,
  ) {}

  async getSummary(userId: number, couponCode?: string) {
    const { cart, items } = await this.getCartByUser(userId);
    let subtotal = 0;
    for (const it of items) {
      subtotal += (it as any).precioUnitario * (it as any).cantidad;
    }

    const SHIPPING_FLAT = Number(process.env.SHIPPING_FLAT ?? 50);
    const TAX_RATE = Number(process.env.TAX_RATE ?? 0.1);

    let discount = 0;
    if (couponCode) {
      let found: any = null;
      if (this.couponRepo) {
        found = await this.couponRepo.findOne({
          where: { code: couponCode, active: true } as any,
        });
      }

      if (!found && this.promotionRepo) {
        found = await this.promotionRepo.findOne({
          where: { code: couponCode, active: true } as any,
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
        if (found.type === 'percent') discount = subtotal * (found.value / 100);
        else discount = found.value;
        if (discount > subtotal) discount = subtotal;
      }
    }

    const envio = SHIPPING_FLAT;
    const impuestos = (subtotal - discount + envio) * TAX_RATE;
    const total = subtotal - discount + envio + impuestos;

    return {
      cart,
      items,
      subtotal,
      envio,
      impuestos,
      descuento: discount,
      total,
    };
  }

  async getCartByUser(userId: number) {
    let cart = await this.cartRepo.findOne({
      where: { usuario_id: userId } as any,
    });
    if (!cart) {
      const newCart = this.cartRepo.create({ usuario_id: userId } as any);
      cart = await this.cartRepo.save(newCart as any);
    }

    const items = await this.cartItemRepo.find({
      where: { carrito: { id: cart!.id } } as any,
    });
    return { cart, items };
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const { productoId, cantidad } = dto;
    const { cart } = await this.getCartByUser(userId);

    let item = await this.cartItemRepo.findOne({
      where: { carrito: { id: cart!.id }, productoId } as any,
    });
    if (item) {
      item.cantidad += cantidad;
      await this.cartItemRepo.save(item);
      return item;
    }

    const menu = await this.menuRepo.findOne({ where: { id: productoId } });
    if (!menu) throw new Error('Menu item not found');
    if (!(menu as any).isAvailable) throw new Error('Menu item not available');
    const precioUnitario = (menu as any)?.price ?? 0;
    const qty = Math.max(
      1,
      Math.min(Number(cantidad) || 1, Number(process.env.MAX_ITEM_QTY ?? 100)),
    );

    item = this.cartItemRepo.create({
      carrito: { id: cart!.id } as any,
      productoId,
      cantidad: qty,
      precioUnitario,
    });
    return this.cartItemRepo.save(item);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto) {
    const item = await this.cartItemRepo.findOne({
      where: { id: itemId },
      relations: ['carrito'],
    });
    if (!item || (item as any).carrito?.usuario_id !== userId) return null;
    if (dto.cantidad !== undefined) {
      const qty = Math.max(
        1,
        Math.min(
          Number(dto.cantidad) || 1,
          Number(process.env.MAX_ITEM_QTY ?? 100),
        ),
      );
      item.cantidad = qty;
    }
    return this.cartItemRepo.save(item);
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.cartItemRepo.findOne({
      where: { id: itemId },
      relations: ['carrito'],
    });
    if (!item || (item as any).carrito?.usuario_id !== userId) return false;
    await this.cartItemRepo.remove(item);
    return true;
  }

  async clearCart(userId: number) {
    const { cart, items } = await this.getCartByUser(userId);
    if (!cart) return;
    await this.cartItemRepo.remove(items);
  }
}
