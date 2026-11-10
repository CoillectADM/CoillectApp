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

  /** `dataHora` enviada pelo dispositivo, guardada como veio (opcional). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  deviceTimestamp: string | null;

  /** Momento em que a API recebeu a leitura (referência oficial). */
  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt: Date;
}
