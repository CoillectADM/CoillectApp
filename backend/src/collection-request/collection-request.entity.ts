import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user/user.entity';
import { Company } from 'src/company/entities/company/company.entity';
import { Sensor } from 'src/sensor/entities/sensor.entity';

export type CollectionRequestStatus =
  | 'PENDING'
  | 'REFUSED'
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED';

/** SENSOR = criada pelo listener ao atingir o limite; MANUAL = fluxo antigo (POST /collection-request). */
export type CollectionRequestOrigin = 'SENSOR' | 'MANUAL';

/** Status que mantêm a solicitação "aberta" (impede duplicar a coleta do mesmo sensor). */
export const OPEN_REQUEST_STATUSES: CollectionRequestStatus[] = [
  'PENDING',
  'SCHEDULED',
];

@Entity({ name: 'collection_requests' })
export class CollectionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  /** Síndico do condomínio: recebe a cópia/notificação da solicitação. */
  @ManyToOne(() => User, { eager: true })
  user: User;

  /** Empresa coletora: recebe a solicitação principal. */
  @ManyToOne(() => Company, { eager: true })
  company: Company;

  /** Sensor que disparou a solicitação (nulo nas solicitações manuais antigas). */
  @ManyToOne(() => Sensor, { eager: true, nullable: true, onDelete: 'SET NULL' })
  sensor: Sensor | null;

  @Column({ type: 'varchar', length: 20 })
  status: CollectionRequestStatus;

  @Column({ type: 'varchar', length: 10, default: 'MANUAL' })
  origin: CollectionRequestOrigin;

  /** Nível do barril (%) no momento em que a solicitação foi criada. */
  @Column({ type: 'int', nullable: true })
  levelAtRequest: number | null;

  @CreateDateColumn()
  requestedAt: Date;

  /** Quando a empresa iniciou (ou agendou) a etapa de coleta. */
  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true })
  userCpfSnapshot: string;

  @Column({ nullable: true })
  companyCnpjSnapshot: string;

  @Column({ nullable: true })
  userAddressSnapshot: string;
}
