import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Address } from './address.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let addressRepo: Partial<Record<keyof Repository<Address>, jest.Mock>>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
    } as any;
    addressRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getProfile lanza NotFoundException si no existe usuario', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.getProfile(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createAddress guarda y retorna la dirección', async () => {
    const user = { id: 1 } as any;
    (userRepo.findOneBy as jest.Mock).mockResolvedValue(user);
    const created = { id: 10, direccion: 'C' };
    (addressRepo.create as jest.Mock).mockReturnValue(created);
    (addressRepo.save as jest.Mock).mockResolvedValue(created);

    const res = await service.createAddress(1, { direccion: 'C' } as any);
    expect(res).toEqual(created);
    expect(addressRepo.save).toHaveBeenCalledWith(created);
  });

  it('deleteAddress lanza NotFoundException si no existe', async () => {
    (addressRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.deleteAddress(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
