import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './restaurant.entity';
import { Menu } from './menu.entity';
import { Category } from './category.entity';
import { MenuImage } from './menu-image.entity';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { User } from '../users/user.entity';
import { RestaurantRepository } from './restaurant.repository';
import { MenuRepository } from './menu.repository';
import { RestaurantFactory } from './restaurant.factory';
import { MenuImagesService } from './menu-images.service';
import { CategoriesService } from './categories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, Menu, Category, MenuImage, User]),
  ],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    RestaurantRepository,
    MenuRepository,
    RestaurantFactory,
    MenuImagesService,
    CategoriesService,
  ],
  exports: [
    RestaurantsService,
    RestaurantRepository,
    MenuRepository,
    RestaurantFactory,
  ],
})
export class RestaurantsModule {}
