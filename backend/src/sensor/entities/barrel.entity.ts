import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Condominium } from './condominium.entity';
import { Sensor } from './sensor.entity';

/** Limite padrão (%) que dispara a solicitação de coleta. */
export const DEFAULT_ALERT_THRESHOLD = 80;

/**
 * Barril (reservatório de óleo) — classe `Barrel` do diagrama de classes da API.
 * O sensor fica "instalado em" um barril e o barril "pertence a" um condomínio.
 * A solicitação de coleta é sempre de um barril específico.
 */
@Entity('barrels')
export class Barrel {
  @PrimaryGeneratedColumn()
  id: number;

  /** codigo (ex.: "BRL-8472"). */
  @Column({ length: 60, unique: true })
  code: string;

  /** pertence a → Condominium (síndico e empresa coletora ficam no condomínio). */
  @ManyToOne(() => Condominium, (condominium) => condominium.barrels, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  condominium: Condominium | null;

  /** capacidadeLitros (informativo). */
  @Column({ type: 'int', nullable: true })
  capacityLiters: number | null;

  /** limiteAlerta: percentual (0–100) a partir do qual a coleta é solicitada. */
  @Column({ type: 'int', default: DEFAULT_ALERT_THRESHOLD })
  alertThreshold: number;

  /** Última vez que o barril foi esvaziado (coleta concluída). */
  @Column({ type: 'timestamptz', nullable: true })
  lastCollectionAt: Date | null;

  @OneToMany(() => Sensor, (sensor) => sensor.barrel)
  sensors: Sensor[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
