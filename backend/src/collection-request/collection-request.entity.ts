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
import { Barrel } from 'src/sensor/entities/barrel.entity';

export type CollectionRequestStatus =
  | 'PENDING'
  | 'REFUSED'
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED';

/**
 * SENSOR  = criada pelo listener quando o barril atinge o limite;
 * COMPANY = a empresa agendou a coleta do barril antes do alerta ("Agendar coleta");
 * MANUAL  = fluxo antigo (POST /collection-request, frontend web).
 */
export type CollectionRequestOrigin = 'SENSOR' | 'COMPANY' | 'MANUAL';

/** Status que mantêm a solicitação "aberta" (impede duplicar a coleta do mesmo barril). */
export const OPEN_REQUEST_STATUSES: CollectionRequestStatus[] = [
  'PENDING',
  'SCHEDULED',
];

@Entity({ name: 'collection_requests' })
export class CollectionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  /** Síndico do condomínio: recebe a cópia/notificação da solicitação (só acompanha). */
  @ManyToOne(() => User, { eager: true })
  user: User;

  /** Empresa coletora ("destinada a"): recebe a solicitação principal. */
  @ManyToOne(() => Company, { eager: true })
  company: Company;

  /** Barril que precisa ser coletado (nulo nas solicitações manuais antigas). */
  @ManyToOne(() => Barrel, { eager: true, nullable: true, onDelete: 'SET NULL' })
  barrel: Barrel | null;

  /** Sensor "associado ao alerta" (nulo nas solicitações manuais antigas). */
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

  /**
   * Nome do comprovante no Blob Storage (container "comprovantes-coleta"),
   * gravado quando a coleta é concluída. Ex.: 2026/11/10/coleta-12-20261110T061500Z.json
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  receiptBlob: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ nullable: true })
  userCpfSnapshot: string;

  @Column({ nullable: true })
  companyCnpjSnapshot: string;

  @Column({ nullable: true })
  userAddressSnapshot: string;
}
