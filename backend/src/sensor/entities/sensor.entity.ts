import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Barrel } from './barrel.entity';

/**
 * Sensor — classe `Sensor` do diagrama de classes da API.
 * `code` é o identificador que o dispositivo envia como `sensorId`
 * (ex.: "CLT-8472-A"), seja ele o ESP32 físico ou o sensor virtual.
 * Limite, capacidade e vínculos ficam no barril em que ele está instalado.
 */
@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  /** codigo */
  @Column({ length: 60, unique: true })
  code: string;

  /** instalado em → Barrel (nulo enquanto o sensor não foi instalado). */
  @ManyToOne(() => Barrel, (barrel) => barrel.sensors, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  barrel: Barrel | null;

  /** percentualAtual: último nível recebido (0–100). */
  @Column({ type: 'int', default: 0 })
  level: number;

  /** ultimaLeitura */
  @Column({ type: 'timestamptz', nullable: true })
  lastReadingAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
