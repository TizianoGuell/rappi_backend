import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
const request = require('supertest');

describe('AuthController (integration)', () => {
  let app: INestApplication;

  const authServiceMock = {
    register: jest.fn().mockResolvedValue({
      message: 'Usuario registrado exitosamente',
      user: { id: 11, email: 'a@b.com' },
    }),
    login: jest.fn().mockResolvedValue({ access_token: 'tok' }),
  } as Partial<AuthService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();

          req.user = { sub: 1 };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => await app.close());

  it('POST /auth/register returns 400 for missing required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'X' });
    expect(res.status).toBe(400);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/register returns 400 for unknown extra properties', async () => {
    const payload = {
      name: 'Juan',
      email: 'juan@example.com',
      password: 'pass123',
      isAdmin: true,
    };
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload);
    expect(res.status).toBe(400);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/register calls service with valid payload', async () => {
    const payload = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secret123',
    };
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload);
    expect(res.status).toBe(201);
    expect(authServiceMock.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana', email: 'ana@example.com' }),
    );
    expect(res.body).toHaveProperty('message');
    expect(res.body.user).toBeDefined();
  });
});
