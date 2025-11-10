import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  const usersServiceMock = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    listAddresses: jest.fn(),
    createAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    getOrderHistory: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.resetAllMocks());

  it('getProfile llama a usersService.getProfile y devuelve datos', async () => {
    usersServiceMock.getProfile.mockResolvedValue({ id: 1, nombre: 'A' });
    const fakeReq: any = { user: { sub: 1 } };
    const res = await controller.getProfile(fakeReq);
    expect(usersServiceMock.getProfile).toHaveBeenCalledWith(1);
    expect(res).toMatchObject({ id: 1 });
  });
});
