import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Role } from '../../modules/auth/role.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) || [];
    if (requiredRoles.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user || {};

    // If token contains textual role (preferred), compare directly.
    if (typeof user.role === 'string') {
      return requiredRoles.includes(user.role);
    }

    // Otherwise, try to resolve role name from roleId (or numeric role claim).
    const roleId =
      user.roleId ?? (typeof user.role === 'number' ? user.role : null);
    if (!roleId) return false;

    try {
      if (!this.dataSource) return false;
      const repo = this.dataSource.getRepository(Role);
      const role = await repo.findOne({ where: { id: Number(roleId) } });
      if (!role || !role.name) return false;
      return requiredRoles.includes(role.name);
    } catch (e) {
      return false;
    }
  }
}
