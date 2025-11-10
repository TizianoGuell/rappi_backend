import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

@Entity({ name: 'driver_positions' })
export class DriverPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Driver, { nullable: false })
  driver: Driver | any;

  @Column({ type: 'double precision', nullable: true })
  lat?: number;

  @Column({ type: 'double precision', nullable: true })
  lng?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
