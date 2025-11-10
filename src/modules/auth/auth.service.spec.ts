import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';
import { BadRequestException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService (unit)', () => {
  let service: AuthService;
  let authRepoMock: Partial<any>;
  let rolesRepoMock: Partial<any>;
  let jwtServiceMock: Partial<any>;

  beforeEach(async () => {
    authRepoMock = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };

    rolesRepoMock = {
      findOne: jest.fn(),
    };

    jwtServiceMock = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepoMock },
        { provide: getRepositoryToken(Role), useValue: rolesRepoMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('lanza BadRequest si el email ya existe', async () => {
      authRepoMock.findByEmail.mockResolvedValue({ id: 1, email: 'a@b.com' });

      await expect(
        service.register({
          name: 'X',
          email: 'a@b.com',
          password: 'p',
          role: undefined,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(authRepoMock.findByEmail).toHaveBeenCalledWith('a@b.com');
    });

    it('crea usuario correctamente asignando role por id', async () => {
      authRepoMock.findByEmail.mockResolvedValue(null);
      rolesRepoMock.findOne.mockResolvedValue({ id: 2, name: 'vendor' });
      (bcrypt as any).hash.mockResolvedValue('hashed-pass');

      const created = {
        name: 'Juan',
        email: 'juan@example.com',
        password: 'hashed-pass',
        role: { id: 2 },
      };
      const saved = {
        id: 10,
        nombre: 'Juan',
        email: 'juan@example.com',
        password: 'hashed-pass',
        telefono: null,
        role: { id: 2, name: 'vendor' },
      };

      authRepoMock.create.mockReturnValue(created);
      authRepoMock.save.mockResolvedValue(saved);

      const res = await service.register({
        name: 'Juan',
        email: 'juan@example.com',
        password: 'pass123',
        phone: '123',
        role: 2,
      } as any);

      expect((bcrypt as any).hash).toHaveBeenCalledWith('pass123', 10);
      expect(authRepoMock.create).toHaveBeenCalled();
      expect(authRepoMock.save).toHaveBeenCalledWith(created);
      expect(res).toHaveProperty('message');
      expect(res.user).toBeDefined();
      expect(res.user.password).toBeUndefined();
    });
  });

  describe('login', () => {
    it('lanza BadRequest si usuario no existe', async () => {
      authRepoMock.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@example.com', password: 'x' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(authRepoMock.findByEmail).toHaveBeenCalledWith(
        'noone@example.com',
      );
    });

    it('devuelve token con credenciales válidas', async () => {
      const user = {
        id: 5,
        email: 'u@u.com',
        password: 'hashed-pass',
        role: { id: 1, name: 'client' },
      };
      authRepoMock.findByEmail.mockResolvedValue(user);
      (bcrypt as any).compare.mockResolvedValue(true);

      const result = await service.login({
        email: 'u@u.com',
        password: 'password123',
      } as any);

      expect(authRepoMock.findByEmail).toHaveBeenCalledWith('u@u.com');
      expect((bcrypt as any).compare).toHaveBeenCalledWith(
        'password123',
        'hashed-pass',
      );
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role?.id ?? null,
      });
      expect(result).toHaveProperty('access_token', 'signed-jwt');
    });

    it('lanza BadRequest si password inválido', async () => {
      const user = { id: 5, email: 'u@u.com', password: 'hashed-pass' };
      authRepoMock.findByEmail.mockResolvedValue(user);
      (bcrypt as any).compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'u@u.com', password: 'wrong' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
