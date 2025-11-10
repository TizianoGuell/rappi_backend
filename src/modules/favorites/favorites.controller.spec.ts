import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../auth/auth.guard';

describe('FavoritesController', () => {
  let controller: FavoritesController;

  const favServiceMock = {
    add: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [{ provide: FavoritesService, useValue: favServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<FavoritesController>(FavoritesController);
  });

  afterEach(() => jest.resetAllMocks());

  it('add calls service.add with user id and restaurant id', async () => {
    favServiceMock.add.mockResolvedValue({ id: 1 });
    const fakeReq: any = { user: { sub: 1 } };
    const res = await controller.add(fakeReq, '2');
    expect(favServiceMock.add).toHaveBeenCalledWith(1, 2);
    expect(res).toMatchObject({ id: 1 });
  });

  it('list returns user favorites', async () => {
    favServiceMock.list.mockResolvedValue([{ id: 5 }]);
    const fakeReq: any = { user: { sub: 1 } };
    const res = await controller.list(fakeReq);
    expect(favServiceMock.list).toHaveBeenCalledWith(1);
    expect(res).toHaveLength(1);
  });

  it('remove calls service.remove with user id and favorite id', async () => {
    favServiceMock.remove.mockResolvedValue({ deleted: true });
    const fakeReq: any = { user: { sub: 1 } };
    const res = await controller.remove(fakeReq, '7');
    expect(favServiceMock.remove).toHaveBeenCalledWith(1, 7);
    expect(res).toEqual({ deleted: true });
  });
});
