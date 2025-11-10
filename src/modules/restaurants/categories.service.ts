import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const c = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
    } as any);
    return this.repo.save(c);
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: number) {
    return this.repo.findOne({ where: { id } as any });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const cur = await this.findOne(id);
    if (!cur) return null;
    Object.assign(cur, dto as any);
    return this.repo.save(cur);
  }

  async remove(id: number) {
    const cur = await this.findOne(id);
    if (!cur) return { deleted: false };
    await this.repo.remove(cur);
    return { deleted: true };
  }
}
