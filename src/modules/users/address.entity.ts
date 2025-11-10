import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('direcciones_usuario')
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'alias', type: 'text', nullable: true })
  alias?: string;

  @Column({ name: 'direccion', type: 'text' })
  direccion: string;

  @ManyToOne(() => User, (u) => u.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  user: User;
}
