import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Role } from '../auth/role.entity';
import { Address } from './address.entity';

@Entity('usuarios') 
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre', type: 'text' })
  nombre: string;

  @Column({ name: 'email', type: 'text', unique: true })
  email: string;

  @Column({ name: 'password', type: 'text' })
  password: string;

  @Column({ name: 'telefono', type: 'text', nullable: true })
  telefono?: string;

  @ManyToOne(() => Role, (r) => (r as any).users, { eager: true })
  @JoinColumn({ name: 'rol_id' })
  role: Role;

  @OneToMany(() => Address, (a) => a.user)
  addresses?: Address[];
}
