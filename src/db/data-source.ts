import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config();

const type = (process.env.DB_TYPE as any) || 'sqlite';

export const AppDataSource = new DataSource({
  type: type,
  ...(type === 'sqlite'
    ? {
        database:
          process.env.DB_SQLITE_PATH ||
          join(__dirname, '..', '..', 'RappiDB.db'),
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }),
  entities: [join(__dirname, '..', '..', 'src', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '..', 'src', 'migrations', '*.{ts,js}')],
  synchronize: false,
});
