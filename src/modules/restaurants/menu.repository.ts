import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';

export interface IMenuRepository {
  create(entity: Partial<Menu>): Menu;
  save(entity: Menu): Promise<Menu>;
  findOneById(id: number): Promise<Menu | null>;
  remove(entity: Menu): Promise<void>;
}

@Injectable()
export class MenuRepository implements IMenuRepository {
  constructor(
    @InjectRepository(Menu) private readonly repo: Repository<Menu>,
  ) {}

  create(entity: Partial<Menu>): Menu {
    return this.repo.create(entity);
  }

  save(entity: Menu): Promise<Menu> {
    return this.repo.save(entity);
  }

  findOneById(id: number): Promise<Menu | null> {
    return this.repo.findOne({ where: { id }, relations: ['restaurant'] });
  }

  async remove(entity: Menu): Promise<void> {
    await this.repo.remove(entity);
  }
}
