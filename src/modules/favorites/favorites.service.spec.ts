import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from './favorites.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from './favorite.entity';
import { User } from '../users/user.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

describe('FavoritesService', () => {
  let service: FavoritesService;

  const favRepoMock: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const userRepoMock: any = {
    findOneBy: jest.fn(),
  };

  const restRepoMock: any = {
    findOneBy: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(Favorite), useValue: favRepoMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: getRepositoryToken(Restaurant), useValue: restRepoMock },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('add creates a new favorite when none exists', async () => {
    userRepoMock.findOneBy.mockResolvedValue({ id: 1 });
    restRepoMock.findOneBy.mockResolvedValue({ id: 2 });
    favRepoMock.findOne.mockResolvedValue(null);
    favRepoMock.create.mockReturnValue({
      user: { id: 1 },
      restaurant: { id: 2 },
    });
    favRepoMock.save.mockResolvedValue({
      id: 10,
      user: { id: 1 },
      restaurant: { id: 2 },
    });

    const res = await service.add(1, 2);

    expect(favRepoMock.create).toHaveBeenCalled();
    expect(favRepoMock.save).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 10 });
  });

  it('add returns existing favorite if present', async () => {
    userRepoMock.findOneBy.mockResolvedValue({ id: 1 });
    restRepoMock.findOneBy.mockResolvedValue({ id: 2 });
    favRepoMock.findOne.mockResolvedValue({
      id: 5,
      user: { id: 1 },
      restaurant: { id: 2 },
    });
    const res = await service.add(1, 2);
    expect(res).toMatchObject({ id: 5 });
    expect(favRepoMock.create).not.toHaveBeenCalled();
  });

  it('list returns favorites for user', async () => {
    favRepoMock.find.mockResolvedValue([{ id: 5, restaurant: { id: 2 } }]);
    const res = await service.list(1);
    expect(favRepoMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        relations: ['restaurant'],
      }),
    );
    expect(res).toHaveLength(1);
  });

  it('remove deletes favorite and returns deleted flag', async () => {
    favRepoMock.findOne.mockResolvedValue({ id: 7, user: { id: 1 } });
    favRepoMock.remove.mockResolvedValue(undefined);
    const res = await service.remove(1, 7);
    expect(favRepoMock.remove).toHaveBeenCalled();
    expect(res).toEqual({ deleted: true });
  });
});
