import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { RestaurantsService } from '../restaurants.service';
import { RestaurantRepository } from '../restaurant.repository';
import { MenuRepository } from '../menu.repository';
import { RestaurantFactory } from '../restaurant.factory';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let restRepo: Partial<RestaurantRepository>;
  let menuRepo: Partial<MenuRepository>;

  beforeEach(async () => {
    restRepo = {
      findByFilters: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
      findAll: jest.fn().mockResolvedValue([]),
      findOneById: jest.fn().mockResolvedValue(null),
    } as any;
    menuRepo = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: RestaurantRepository, useValue: restRepo },
        { provide: MenuRepository, useValue: menuRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: RestaurantFactory,
          useValue: { createRestaurant: jest.fn(), createMenu: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  it('findAll delegates to repository when filters provided', async () => {
    const res = await service.findAll({
      search: 'pizza',
      page: 2,
      limit: 5,
    } as any);
    expect(restRepo.findByFilters as any).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'pizza' }),
    );
    expect(res).toHaveProperty('items');
  });

  it('findOne enriches menus with images and promotions when services available', async () => {
    const menu = {
      id: 11,
      name: 'X',
      images: undefined,
      promotions: undefined,
    } as any;
    const restaurant = { id: 2, menus: [menu], owner: null } as any;
    (restRepo.findOneById as any).mockResolvedValueOnce(restaurant);

    (service as any).menuImagesService = {
      listImages: jest.fn().mockResolvedValue(['a.jpg']),
    };
    (service as any).promotionsService = {
      findPromotionsForProduct: jest
        .fn()
        .mockResolvedValue([{ id: 1, code: 'PROMO' }]),
    };

    const out = await service.findOne(2);
    expect((service as any).menuImagesService.listImages).toHaveBeenCalledWith(
      11,
    );
    expect(
      (service as any).promotionsService.findPromotionsForProduct,
    ).toHaveBeenCalledWith(11);
    expect((out as any).menus?.[0].images).toEqual(['a.jpg']);
    expect((out as any).menus?.[0].promotions).toEqual([
      { id: 1, code: 'PROMO' },
    ]);
  });
});
