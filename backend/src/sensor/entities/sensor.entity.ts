import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Condominium } from './condominium.entity';

/**
 * Sensor/barril. O campo `code` é o identificador que o dispositivo envia
 * como `sensorId` (ex.: "COI-DEMO-01"), seja ele físico (ESP32) ou virtual.
 */
@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, unique: true })
  code: string;

  @ManyToOne(() => Condominium, (condominium) => condominium.sensors, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  condominium: Condominium | null;

  /** Percentual (0–100) a partir do qual a solicitação de coleta é criada. */
  @Column({ type: 'int', default: 80 })
  threshold: number;

  /** Capacidade do barril em litros (informativo). */
  @Column({ type: 'int', nullable: true })
  capacityLiters: number | null;

  /** Último nível recebido, em percentual (0–100). */
  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadingAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastCollectionAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
