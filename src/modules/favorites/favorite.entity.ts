import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

@Entity({ name: 'favoritos' })
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => (user as any).favorites, { eager: false })
  user: User;

  @ManyToOne(() => Restaurant, (r) => (r as any).favorites, { eager: false })
  restaurant: Restaurant;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
