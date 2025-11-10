import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantRepository } from './restaurant.repository';
import { MenuRepository } from './menu.repository';
import { RestaurantFactory } from './restaurant.factory';
import { Restaurant } from './restaurant.entity';
import { Menu } from './menu.entity';
import { User } from '../users/user.entity';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  const restaurantRepoMock: Partial<any> = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const menuRepoMock: Partial<any> = {
    create: jest.fn(),
    save: jest.fn(),
    findOneById: jest.fn(),
    remove: jest.fn(),
  };

  const factoryMock: Partial<any> = {
    createRestaurant: jest.fn(),
    createMenu: jest.fn(),
  };

  const userRepoMock: Partial<any> = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: RestaurantRepository, useValue: restaurantRepoMock },
        { provide: MenuRepository, useValue: menuRepoMock },
        { provide: RestaurantFactory, useValue: factoryMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a restaurant with owner when ownerId provided', async () => {
      const dto = { name: 'R', address: 'A' } as any;
      const fakeUser = { id: 5 } as User;
      userRepoMock.findOne.mockResolvedValueOnce(fakeUser);
      const createdEntity = new Restaurant();
      factoryMock.createRestaurant.mockReturnValueOnce(createdEntity);
      restaurantRepoMock.save.mockResolvedValueOnce({ id: 1 } as any);

      const res = await service.create(dto, 5);

      expect(userRepoMock.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(factoryMock.createRestaurant).toHaveBeenCalledWith(dto, fakeUser);
      expect(restaurantRepoMock.save).toHaveBeenCalledWith(createdEntity);
      expect(res).toHaveProperty('id', 1);
    });
  });

  describe('findAll', () => {
    it('returns all restaurants', async () => {
      restaurantRepoMock.findAll.mockResolvedValueOnce([{ id: 1 }]);
      const res = await service.findAll();
      expect(restaurantRepoMock.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: 1 }]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      restaurantRepoMock.findOneById.mockResolvedValueOnce(null);
      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update/remove ownership checks', () => {
    it('update throws ForbiddenException if requester is not owner', async () => {
      const r = { id: 2, owner: { id: 20 } } as any;
      restaurantRepoMock.findOneById.mockResolvedValueOnce(r);
      await expect(
        service.update(2, { name: 'x' } as any, 1),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('remove throws ForbiddenException if requester is not owner', async () => {
      const r = { id: 3, owner: { id: 30 } } as any;
      restaurantRepoMock.findOneById.mockResolvedValueOnce(r);
      await expect(service.remove(3, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('createMenu', () => {
    it('creates a menu when requester is owner', async () => {
      const restaurant = { id: 4, owner: { id: 7 } } as any;
      restaurantRepoMock.findOneById.mockResolvedValueOnce(restaurant);
      const dto = { name: 'Menu', price: '9.99' } as any;
      const createdMenu = new Menu();
      factoryMock.createMenu.mockReturnValueOnce(createdMenu);
      menuRepoMock.save.mockResolvedValueOnce({ id: 11 } as any);

      const res = await service.createMenu(4, dto, 7);

      expect(restaurantRepoMock.findOneById).toHaveBeenCalledWith(4);
      expect(factoryMock.createMenu).toHaveBeenCalledWith(dto, restaurant);
      expect(menuRepoMock.save).toHaveBeenCalledWith(createdMenu);
      expect(res).toHaveProperty('id', 11);
    });
  });
});
