import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user/user.entity';
import { Company } from '../../company/entities/company/company.entity';
import { Sensor } from './sensor.entity';

/**
 * Condomínio atendido pelo Coillect.
 * Liga o síndico (app-mobile-sindico) à empresa coletora (app-mobile-empresa)
 * e aos sensores/barris instalados.
 */
@Entity('condominiums')
export class Condominium {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  /** Síndico responsável (usuário comum, login em /auth/login). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  sindico: User | null;

  /** Empresa coletora que recebe as solicitações deste condomínio. */
  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  company: Company | null;

  @OneToMany(() => Sensor, (sensor) => sensor.condominium)
  sensors: Sensor[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
