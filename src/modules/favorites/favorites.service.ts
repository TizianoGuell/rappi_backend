import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { User } from '../users/user.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Restaurant) private restRepo: Repository<Restaurant>,
  ) {}

  async add(userId: number, restaurantId: number) {
    const user = await this.userRepo.findOneBy({ id: userId } as any);
    if (!user) throw new NotFoundException('User not found');
    const restaurant = await this.restRepo.findOneBy({
      id: restaurantId,
    } as any);
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const exists = await this.favRepo.findOne({
      where: {
        user: { id: userId } as any,
        restaurant: { id: restaurantId } as any,
      },
    });
    if (exists) return exists;

    const fav = this.favRepo.create({ user, restaurant } as any);
    return this.favRepo.save(fav);
  }

  async remove(userId: number, favId: number) {
    const fav = await this.favRepo.findOne({
      where: { id: favId, user: { id: userId } as any },
    });
    if (!fav) throw new NotFoundException('Favorite not found');
    await this.favRepo.remove(fav);
    return { deleted: true };
  }

  async list(userId: number) {
    return this.favRepo.find({
      where: { user: { id: userId } as any },
      relations: ['restaurant'],
    });
  }
}
