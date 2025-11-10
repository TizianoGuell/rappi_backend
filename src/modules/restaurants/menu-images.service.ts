import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Optional } from '@nestjs/common';
import { MenuImage } from './menu-image.entity';
import { Menu } from './menu.entity';

@Injectable()
export class MenuImagesService {
  constructor(
    @InjectRepository(MenuImage) private readonly repo: Repository<MenuImage>,
    @InjectRepository(Menu) private readonly menuRepo?: Repository<Menu>,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  async createImage(menuId: number, url: string, isPrimary = false) {
    if (this.menuRepo) {
      try {
        await this.menuRepo.findOne({ where: { id: menuId } as any });
      } catch {
      }
    }
    if (isPrimary) {
      try {
        await this.repo
          .createQueryBuilder()
          .update(MenuImage)
          .set({ isPrimary: false })
          .where('menu_id = :menuId', { menuId })
          .execute();
      } catch {
      }
    }
    try {
      const img = this.repo.create({
        menu: { id: menuId } as any,
        url,
        isPrimary,
      } as any);
      return await this.repo.save(img);
    } catch (e) {
      if (!this.dataSource) throw e;
      try {
        await this.dataSource.query(
          `INSERT INTO menu_images (menu_id, url, is_primary, created_at) VALUES (?, ?, ?, datetime('now'))`,
          [menuId, url, isPrimary ? 1 : 0],
        );
        const rows = await this.dataSource.query(
          `SELECT * FROM menu_images WHERE rowid = last_insert_rowid()`,
        );
        return rows && rows[0] ? rows[0] : { menuId, url, isPrimary };
      } catch (e2) {
        throw e2;
      }
    }
  }

  async listImages(menuId: number) {
    return this.repo.find({
      where: { menu: { id: menuId } as any } as any,
      order: { isPrimary: 'DESC', createdAt: 'ASC' } as any,
    });
  }

  async removeImageById(imageId: number) {
    const img = await this.repo.findOne({ where: { id: imageId } as any });
    if (!img) return { deleted: false };

    try {
      const { unlinkSync, existsSync } = await Promise.resolve(require('fs'));
      const path = (img as any).url || (img as any).ruta || '';
      if (path && path.startsWith('/uploads')) {
        const fullPath = `${process.cwd()}${path}`;
        if (existsSync(fullPath)) {
          try {
            unlinkSync(fullPath);
          } catch (e) {
          }
        }
      }
    } catch {
    }
    await this.repo.remove(img);
    return { deleted: true };
  }

  async markPrimary(menuId: number, imageId: number) {
    const img = await this.repo.findOne({
      where: { id: imageId, menu: { id: menuId } as any } as any,
    });
    if (!img) return { error: 'image not found' };
    await this.repo
      .createQueryBuilder()
      .update(MenuImage)
      .set({ isPrimary: false })
      .where('menu_id = :menuId', { menuId })
      .execute();
    img.isPrimary = true;
    return this.repo.save(img);
  }
}
