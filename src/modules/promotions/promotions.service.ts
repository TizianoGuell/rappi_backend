import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './promotion.entity';
import { Menu } from '../restaurants/menu.entity';
import { PromotionProduct } from './promotion-product.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionProduct)
    private promoProductRepo?: Repository<PromotionProduct>,
  ) {}

  async findByCode(code: string) {
    if (!code) return null;
    try {
      const p = await this.promoRepo.findOne({ where: { code, active: true } as any });
      return p || null;
    } catch (e) {
      return null;
    }
  }

  async validateCode(code: string, subtotal: number, items: any[], menuRepo?: Repository<Menu>) {
    const promo = await this.findByCode(code);
    if (!promo) return { valid: false, discount: 0 };
    const discount = await this.computeDiscount(promo, subtotal, items, menuRepo);
    const hasAmount = typeof (promo as any).amount === 'number' && (promo as any).amount > 0;
    const hasPercent = typeof (promo as any).percent === 'number' && (promo as any).percent > 0;
    return { valid: discount > 0 || hasAmount || hasPercent, discount: discount || 0, promotion: promo };
  }

  async computeDiscount(
    promo: any,
    subtotal: number,
    items: any[],
    menuRepo?: Repository<Menu>,
  ) {
    if (!promo) return 0;

    const now = new Date();

    if (promo.startsAt) {
      const s = new Date(promo.startsAt);
      if (now < s) return 0;
    }
    if (promo.endsAt) {
      const e = new Date(promo.endsAt);
      if (now > e) return 0;
    }

    if (promo.maxUses && typeof promo.usedCount === 'number') {
      if (promo.usedCount >= promo.maxUses) return 0;
    }

    if (promo.vendorId) {
      if (!menuRepo) return 0; // cannot validate vendor without menuRepo
      if (!items || items.length === 0) return 0;
      const first = items[0];
      const menu = await menuRepo.findOne({
        where: { id: first.productoId },
        relations: ['restaurant', 'restaurant.owner'],
      } as any);
      const vendorId =
        menu && menu.restaurant && menu.restaurant.owner
          ? menu.restaurant.owner.id
          : null;
      if (!vendorId || Number(vendorId) !== Number(promo.vendorId)) return 0;
    }

    if (promo.id) {
      if (this.promoProductRepo) {
        try {
          const mappings: PromotionProduct[] = await this.promoProductRepo.find(
            { where: { promotion: { id: promo.id } as any } as any },
          );
          if (mappings && mappings.length > 0) {
            const mappedIds = mappings.map((m) => Number(m.productId));
            const foundMatch = (items || []).some((it: any) =>
              mappedIds.includes(Number(it.productoId)),
            );
            if (!foundMatch) return 0;
          }
        } catch (e) {
          return 0;
        }
      } else {
        return 0;
      }
    }

    if (promo.type === 'percent' || promo.percent) {
      const perc = promo.type === 'percent' ? promo.value : promo.percent;
      return subtotal * (perc / 100);
    }

    if (promo.type === 'amount' || promo.amount || promo.value) {
      const val =
        promo.type === 'amount'
          ? promo.value
          : (promo.amount ?? promo.value ?? 0);
      return val;
    }
    return 0;
  }

  async create(user: any, dto: any) {
    if (user.role === 'vendor') {
      dto.vendorId = dto.vendorId ?? user.sub;
    }
    const promo = this.promoRepo.create({ ...dto });
    return this.promoRepo.save(promo);
  }

  async createWithProduct(user: any, dto: any) {
    const saved = await this.create(user, dto);
    if (dto.productId) {
      if (!this.promoProductRepo) {
        throw new NotFoundException(
          'promotion_products mapping not available in DB',
        );
      }
      const mapping = this.promoProductRepo.create({
        promotion: { id: (saved as any).id } as any,
        productId: Number(dto.productId),
        code: dto.code,
      } as any);
      await this.promoProductRepo.save(mapping);
    }
    return saved;
  }

  async findAll(filter?: any) {
    const qb = this.promoRepo.createQueryBuilder('p');
    if (filter?.vendorId)
      qb.where('p.vendorId = :vendorId', { vendorId: filter.vendorId });
    return qb.orderBy('p.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const p = await this.promoRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Promotion not found');
    return p;
  }

  async update(user: any, id: number, dto: any) {
    const p = await this.findOne(id);

    if (user.role === 'vendor' && p.vendorId && p.vendorId !== user.sub) {
      throw new ForbiddenException('cannot modify promotions of other vendors');
    }
    Object.assign(p, dto);
    return this.promoRepo.save(p);
  }

  async updateWithProduct(user: any, id: number, dto: any) {
    const updated = await this.update(user, id, dto);
    if (dto.productId) {
      if (!this.promoProductRepo) {
        throw new NotFoundException(
          'promotion_products mapping not available in DB',
        );
      }
      try {
        const existing = await this.promoProductRepo.findOne({
          where: { promotion: { id } as any } as any,
        });
        if (existing) {
          existing.productId = Number(dto.productId);
          existing.code = dto.code ?? existing.code;
          await this.promoProductRepo.save(existing);
        } else {
          const mapping = this.promoProductRepo.create({
            promotion: { id } as any,
            productId: Number(dto.productId),
            code: dto.code,
          } as any);
          await this.promoProductRepo.save(mapping);
        }
      } catch (e) {
        throw e;
      }
    }
    return updated;
  }

  async remove(user: any, id: number) {
    const p = await this.findOne(id);
    if (user.role === 'vendor' && p.vendorId && p.vendorId !== user.sub) {
      throw new ForbiddenException('cannot remove promotions of other vendors');
    }
    await this.promoRepo.remove(p);
    return { deleted: true };
  }

  async removeWithProduct(user: any, id: number) {
    const p = await this.findOne(id);
    await this.remove(user, id);
    try {
      if (this.promoProductRepo) {
        const existing = await this.promoProductRepo.findOne({
          where: { promotion: { id } as any } as any,
        });
        if (existing) await this.promoProductRepo.remove(existing);
      }
    } catch {
    }
    return { deleted: true };
  }

  async findPromotionsForProduct(productId: number) {
    if (!this.promoProductRepo) return [];
    try {
      const mappings = await this.promoProductRepo.find({
        where: { productId: Number(productId) } as any,
        relations: ['promotion'],
      } as any);
      return (mappings || []).map((m: any) => m.promotion).filter(Boolean);
    } catch {
      return [];
    }
  }

  async deactivateExpired() {
    try {
      const all = await this.promoRepo.find();
      const now = new Date();
      for (const p of all) {
        if (p.endsAt && new Date(p.endsAt) < now) {
          p.active = false;
          await this.promoRepo.save(p);
        } else if (
          p.maxUses &&
          typeof p.usedCount === 'number' &&
          p.usedCount >= p.maxUses
        ) {
          p.active = false;
          await this.promoRepo.save(p);
        }
      }
    } catch {
    }
  }

  async assignProducts(user: any, promotionId: number, productIds: number[]) {
    const p = await this.findOne(promotionId);

    if (user.role === 'vendor' && p.vendorId && p.vendorId !== user.sub) {
      throw new ForbiddenException('cannot modify promotions of other vendors');
    }
    if (!this.promoProductRepo) {
      throw new NotFoundException(
        'promotion_products mapping not available in DB',
      );
    }
    const created: PromotionProduct[] = [];
    for (const pid of productIds || []) {
      const existing = await this.promoProductRepo.findOne({
        where: {
          promotion: { id: promotionId } as any,
          productId: Number(pid),
        } as any,
      });
      if (existing) {
        created.push(existing);
        continue;
      }
      const mapping = this.promoProductRepo.create({
        promotion: { id: promotionId } as any,
        productId: Number(pid),
      } as any);
      const saved = await this.promoProductRepo.save(mapping);
      created.push(saved as unknown as PromotionProduct);
    }
    return created;
  }

  async removeProduct(user: any, promotionId: number, productId: number) {
    const p = await this.findOne(promotionId);
    if (user.role === 'vendor' && p.vendorId && p.vendorId !== user.sub) {
      throw new ForbiddenException('cannot modify promotions of other vendors');
    }
    if (!this.promoProductRepo) {
      throw new NotFoundException(
        'promotion_products mapping not available in DB',
      );
    }
    const existing = await this.promoProductRepo.findOne({
      where: {
        promotion: { id: promotionId } as any,
        productId: Number(productId),
      } as any,
    });
    if (!existing) return { deleted: false };
    await this.promoProductRepo.remove(existing);
    return { deleted: true };
  }
}
