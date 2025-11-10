import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export interface IRestaurantRepository {
  create(entity: Partial<Restaurant>): Restaurant;
  save(entity: Restaurant): Promise<Restaurant>;
  findAll(): Promise<Restaurant[]>;
  findOneById(id: number): Promise<Restaurant | null>;
  update(id: number, partial: Partial<Restaurant>): Promise<void>;
  remove(entity: Restaurant): Promise<void>;
}

@Injectable()
export class RestaurantRepository implements IRestaurantRepository {
  constructor(
    @InjectRepository(Restaurant) private readonly repo: Repository<Restaurant>,
  ) {}

  create(entity: Partial<Restaurant>): Restaurant {
    return this.repo.create(entity);
  }

  save(entity: Restaurant): Promise<Restaurant> {
    return this.repo.save(entity);
  }

  findAll(): Promise<Restaurant[]> {
    return this.repo.find({ relations: ['owner', 'menus'] });
  }

  async findByFilters(filters: {
    search?: string;
    category?: string;
    cuisine?: string;
    page?: number;
    limit?: number;
    minRating?: number;
    sort?: string;
  }): Promise<{
    items: Restaurant[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.menus', 'm')
      .leftJoinAndSelect('r.owner', 'o')

      .leftJoin('reviews', 'rev', 'rev.restaurant_id = r.id')
      .addSelect('AVG(rev.rating)', 'avgRating')
      .groupBy('r.id')
      .addGroupBy('o.id')
      .addGroupBy('m.id');

    if (filters.search) {
      qb.andWhere('(r.name LIKE :s OR r.description LIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    if (filters.category) {
      qb.andWhere('r.category = :category', { category: filters.category });
    }
    if (filters.cuisine) {
      qb.andWhere('r.cuisine = :cuisine', { cuisine: filters.cuisine });
    }

    if (typeof filters.minRating === 'number') {
      qb.having('AVG(rev.rating) >= :minRating', {
        minRating: filters.minRating,
      });
    }

    if (filters.sort === 'rating') {
      qb.orderBy('avgRating', 'DESC');
    } else if (filters.sort === 'createdAt') {
      qb.orderBy('r.createdAt', 'DESC');
    } else {
      qb.orderBy('r.name', 'ASC');
    }

    const [items, total] = await qb.take(limit).skip(skip).getManyAndCount();
    return { items, total, page, limit };
  }

  findOneById(id: number): Promise<Restaurant | null> {
    return this.repo.findOne({ where: { id }, relations: ['owner', 'menus'] });
  }

  async update(id: number, partial: Partial<Restaurant>): Promise<void> {
    await this.repo.update(id, partial);
  }

  async remove(entity: Restaurant): Promise<void> {
    await this.repo.remove(entity);
  }
}
