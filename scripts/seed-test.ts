import * as dotenv from 'dotenv';
dotenv.config();

import { join } from 'path';
import { AppDataSource } from '../src/db/data-source';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/auth/role.entity';
import { User } from '../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';

// For safety, force the sqlite path to the test DB file
process.env.DB_SQLITE_PATH = process.env.DB_SQLITE_PATH || join(__dirname, '..', 'RappiDB.db');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'admin123';

const ROLES = ['client', 'vendor', 'driver', 'admin'];

async function seed() {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    const roleRepo = ds.getRepository(Role);
    const userRepo = ds.getRepository(User);

    for (const r of ROLES) {
      const existing = await roleRepo.findOne({ where: { name: r } as any });
      if (!existing) {
        await roleRepo.save(roleRepo.create({ name: r } as any));
        console.log('Inserted role:', r);
      } else {
        console.log('Role already exists:', r);
      }
    }

    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } as any });
    if (!adminRole) throw new Error('admin role missing after seed');

    const existingAdmin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } as any });
    if (existingAdmin) {
      console.log('Admin user already exists:', ADMIN_EMAIL);
    } else {
      const hashed = await bcrypt.hash(ADMIN_PASS, 10);
      const admin = userRepo.create({ nombre: 'Admin', email: ADMIN_EMAIL, password: hashed, role: adminRole } as any);
      await userRepo.save(admin);
      console.log('Inserted admin user:', ADMIN_EMAIL);
    }

    console.log('Test DB seeding complete -- DB file used:', process.env.DB_SQLITE_PATH);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  } finally {
    if (ds && ds.isInitialized) await ds.destroy();
  }
}

seed();
