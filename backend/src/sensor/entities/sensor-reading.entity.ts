import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sensor } from './sensor.entity';

/** Histórico de leituras recebidas do sensor (físico ou virtual). */
@Entity('sensor_readings')
export class SensorReading {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sensor, { onDelete: 'CASCADE' })
  sensor: Sensor;

  /** Nível em percentual (0–100). */
  @Column({ type: 'int' })
  level: number;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt: Date;
}
