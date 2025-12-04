import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Menu } from './menu.entity';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import { CreateMenuDto } from './dtos/create-menu.dto';
import { UpdateMenuDto } from './dtos/update-menu.dto';
import { User } from '../users/user.entity';
import { RestaurantRepository } from './restaurant.repository';
import { MenuRepository } from './menu.repository';
import { RestaurantFactory } from './restaurant.factory';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly restaurantsRepo: RestaurantRepository,
    private readonly menusRepo: MenuRepository,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly factory: RestaurantFactory,
    @Optional()
    private readonly menuImagesService?: import('./menu-images.service').MenuImagesService,
    @Optional()
    private readonly promotionsService?: import('../promotions/promotions.service').PromotionsService,
  ) {}

  async create(dto: CreateRestaurantDto, ownerId?: number) {
    let owner: User | undefined = undefined;
    if (ownerId) {
      const found = await this.usersRepo.findOne({ where: { id: ownerId } });
      owner = found ?? undefined;
    }

    const restaurantEntity = this.factory.createRestaurant(dto, owner);
    return this.restaurantsRepo.save(restaurantEntity);
  }

  async findAll(filters?: {
    search?: string;
    category?: string;
    cuisine?: string;
    page?: number;
    limit?: number;
    minRating?: number;
    sort?: string;
  }) {
    if (
      filters &&
      (filters.search ||
        filters.category ||
        filters.cuisine ||
        typeof filters.minRating === 'number' ||
        filters.page ||
        filters.limit ||
        filters.sort)
    ) {
      return this.restaurantsRepo.findByFilters(filters as any);
    }

    return this.restaurantsRepo.findAll();
  }

  async findOne(id: number) {
    const r = await this.restaurantsRepo.findOneById(id);
    if (!r) throw new NotFoundException('Restaurant not found');

    if (r.menus && r.menus.length > 0) {
      for (const m of r.menus) {
        try {
          if (this.menuImagesService) {
            m.images = await this.menuImagesService.listImages(m.id);
          }
        } catch {
        }
        try {
          if (this.promotionsService) {
            m.promotions =
              await this.promotionsService.findPromotionsForProduct(m.id);
          }
        } catch {
        }
      }
    }
    return r;
  }

  async update(
    id: number,
    dto: UpdateRestaurantDto,
    requesterId?: number,
    requesterRole?: string,
  ) {
    const r = await this.findOne(id);

    if (
      r.owner &&
      requesterId &&
      r.owner.id !== requesterId &&
      requesterRole !== 'admin'
    ) {
      throw new ForbiddenException(
        'No autorizado para modificar este restaurante',
      );
    }
    await this.restaurantsRepo.update(id, dto as Partial<Restaurant>);
    return this.findOne(id);
  }

  async remove(id: number, requesterId?: number, requesterRole?: string) {
    const r = await this.findOne(id);
    if (
      r.owner &&
      requesterId &&
      r.owner.id !== requesterId &&
      requesterRole !== 'admin'
    ) {
      throw new ForbiddenException(
        'No autorizado para eliminar este restaurante',
      );
    }
    await this.restaurantsRepo.remove(r);
    return { deleted: true };
  }

  async createMenu(
    restaurantId: number,
    dto: CreateMenuDto,
    requesterId?: number,
  ) {
    const restaurant = await this.findOne(restaurantId);
    if (
      restaurant.owner &&
      requesterId &&
      restaurant.owner.id !== requesterId
    ) {
      throw new ForbiddenException('No autorizado para añadir menú');
    }
    const menuEntity = this.factory.createMenu(dto, restaurant);
    return this.menusRepo.save(menuEntity);
  }

  async updateMenu(menuId: number, dto: UpdateMenuDto, requesterId?: number) {
    const menu = await this.menusRepo.findOneById(menuId);
    if (!menu) throw new NotFoundException('Menu not found');
    if (
      menu.restaurant?.owner &&
      requesterId &&
      menu.restaurant.owner.id !== requesterId
    ) {
      throw new ForbiddenException('No autorizado para modificar este menú');
    }
    Object.assign(menu, dto as Partial<Menu>);
    return this.menusRepo.save(menu);
  }

  async deleteMenu(menuId: number, requesterId?: number) {
    const menu = await this.menusRepo.findOneById(menuId);
    if (!menu) throw new NotFoundException('Menu not found');
    if (
      menu.restaurant?.owner &&
      requesterId &&
      menu.restaurant.owner.id !== requesterId
    ) {
      throw new ForbiddenException('No autorizado para eliminar este menú');
    }
    await this.menusRepo.remove(menu);
    return { deleted: true };
  }

  async findMenuById(menuId: number) {
    const menu = await this.menusRepo.findOneById(menuId);
    if (!menu) throw new NotFoundException('Menu not found');

    try {
      if (this.menuImagesService) {
        menu.images = await this.menuImagesService.listImages(menu.id);
      }
    } catch {
    }
    try {
      if (this.promotionsService) {
        menu.promotions = await this.promotionsService.findPromotionsForProduct(
          menu.id,
        );
      }
    } catch {
    }
    return menu;
  }
}
