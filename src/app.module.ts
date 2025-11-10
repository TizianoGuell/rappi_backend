import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CartModule } from './modules/cart/cart.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupportModule } from './modules/support/support.module';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
class MigrationsRunner implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
  async onModuleInit() {
    try {
      if (!this.dataSource.isInitialized) await this.dataSource.initialize();

      try {
        if ((this.dataSource.options as any).type === 'sqlite') {
          await this.dataSource.query(`PRAGMA journal_mode = WAL`);
          await this.dataSource.query(`PRAGMA busy_timeout = 5000`);
        }
      } catch (e) {}

      await this.dataSource.runMigrations();
    } catch (e) {}
  }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(__dirname, '..', 'RappiDB.db'),
      entities: [join(__dirname, '..', '..', 'src', '**', '*.entity.{ts,js}')],
      migrations: [
        join(__dirname, '..', '..', 'src', 'migrations', '*.{ts,js}'),
      ],
      synchronize: false, // importante: no modificar esquema existente
    }),
    AuthModule,
    UsersModule,
    CartModule,
    RestaurantsModule,
    DriversModule,
    ReportsModule,
    AdminModule,
    OrdersModule,
    FavoritesModule,
    NotificationsModule,
    SupportModule,
  ],
  providers: [MigrationsRunner],
})
export class AppModule {}
