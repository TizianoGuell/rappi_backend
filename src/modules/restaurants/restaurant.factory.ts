import { Injectable } from '@nestjs/common';
import { Restaurant } from './restaurant.entity';
import { Menu } from './menu.entity';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { CreateMenuDto } from './dtos/create-menu.dto';
import { User } from '../users/user.entity';

@Injectable()
export class RestaurantFactory {
  createRestaurant(dto: CreateRestaurantDto, owner?: User): Restaurant {
    const r = new Restaurant();
    r.name = dto.name;
    r.description = dto.description ?? undefined;
    r.address = dto.address ?? undefined;
    r.phone = dto.phone ?? undefined;
    r.owner = owner;
    r.isActive = true;
    return r;
  }

  createMenu(dto: CreateMenuDto, restaurant: Restaurant): Menu {
    const m = new Menu();
    m.name = dto.name;
    m.description = dto.description ?? undefined;
    m.price =
      typeof dto.price === 'string'
        ? parseFloat(dto.price)
        : (dto.price as any);
    m.isAvailable = dto.isAvailable ?? true;
    m.restaurant = restaurant;
    return m;
  }
}
