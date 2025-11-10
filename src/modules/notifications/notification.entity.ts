import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'notificaciones' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => (u as any).notifications, { eager: false })
  user: User;

  @Column({ name: 'titulo', type: 'text' })
  title: string;

  @Column({ name: 'cuerpo', type: 'text', nullable: true })
  body?: string;

  @Column({ name: 'tipo', type: 'text', nullable: true })
  type?: string;

  @Column({ name: 'datos', type: 'text', nullable: true })
  data?: string;

  @Column({ name: 'leido', type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
