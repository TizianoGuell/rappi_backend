import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthRepository } from './auth.repository';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
  ) {}

  async register(registerDto: RegisterDto) {
  const { name, email, password, phone, role: roleParam } = registerDto;

    const existing = await this.authRepository.findByEmail(email);
    if (existing)
      throw new BadRequestException('El usuario ya está registrado');

    let role: Role | null = null;

    if (roleParam !== undefined && roleParam !== null && roleParam !== '') {
      if (typeof roleParam === 'number' || /^[0-9]+$/.test(String(roleParam))) {
        const id = Number(roleParam);
        role = await this.rolesRepo.findOne({ where: { id } });
      } else {
        role = await this.rolesRepo.findOne({
          where: { name: String(roleParam) },
        });
      }
    }

    if (!role) {
      role = await this.rolesRepo.findOne({ where: { id: 1 } });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Map DTO fields (English) to entity column names (Spanish) so TypeORM
    // inserts into the correct columns (User entity uses 'nombre' and 'telefono').
    const user = this.authRepository.create({
      nombre: name,
      email,
      password: hashed,
      telefono: phone,
      role,
    } as any);
    const saved = await this.authRepository.save(user);

    const { password: _, ...result } = saved as any;
    return { message: 'Usuario registrado exitosamente', user: result };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.authRepository.findByEmail(email);
    if (!user) throw new BadRequestException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new BadRequestException('Credenciales inválidas');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.id ?? null,
    };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }

  async validateUserById(id: number) {
    return this.authRepository.findById(id);
  }
}
