import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/entities/user/user.entity';
import { Company } from '../company/entities/company/company.entity';
import { CollectionRequest } from '../collection-request/collection-request.entity';

export type NotificationType =
  | 'COLLECTION_REQUESTED'
  | 'COLLECTION_SCHEDULED'
  | 'COLLECTION_COMPLETED'
  | 'COLLECTION_REFUSED'
  | 'COLLECTION_CANCELLED'
  /** "Precisa de ajuda?" do app do síndico (sem solicitação de coleta vinculada). */
  | 'HELP_REQUESTED';

/** Quem recebe: o síndico (app-mobile-sindico) ou a empresa coletora (app-mobile-empresa). */
export type NotificationAudience = 'SINDICO' | 'EMPRESA';

/**
 * Notificação VINCULADA à solicitação de coleta. Para o síndico é uma cópia
 * informativa (ele não age sobre a coleta); para a empresa é o aviso de que há
 * uma nova solicitação para atender. Nunca é uma segunda coleta.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, default: 'SINDICO' })
  audience: NotificationAudience;

  /** Síndico que recebe a notificação (audience = SINDICO). */
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  user: User | null;

  /** Empresa que recebe a notificação (audience = EMPRESA). */
  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company | null;

  /** Solicitação de coleta da notificação (null no pedido de ajuda). */
  @ManyToOne(() => CollectionRequest, {
    eager: true,
    nullable: true,
    onDelete: 'CASCADE',
  })
  collectionRequest: CollectionRequest | null;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ length: 120 })
  title: string;

  @Column({ length: 300 })
  message: string;

  @Column({ default: false })
  read: boolean;

  /**
   * Chave de idempotência: id da mensagem da fila + destinatário. A fila do
   * Azure entrega "pelo menos uma vez"; se a mesma mensagem chegar de novo,
   * a notificação não é duplicada.
   */
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  dedupeKey: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
