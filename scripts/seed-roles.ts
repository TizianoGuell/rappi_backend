import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/db/data-source';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/auth/role.entity';

const ROLES = ['client', 'vendor', 'driver', 'admin'];

async function seed() {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    const roleRepo = ds.getRepository(Role);

    for (const r of ROLES) {
      const existing = await roleRepo.findOne({ where: { name: r } as any });
      if (!existing) {
        await roleRepo.save(roleRepo.create({ name: r } as any));
        console.log('Inserted role:', r);
      } else {
        console.log('Role already exists:', r);
      }
    }
    console.log('Role seeding complete');
  } catch (err) {
    console.error('Seeding failed', err);
  } finally {
    if (ds && ds.isInitialized) await ds.destroy();
  }
}

seed();