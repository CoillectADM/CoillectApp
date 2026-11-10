import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/entities/user/user.entity';
import { CollectionRequest } from '../collection-request/collection-request.entity';

export type NotificationType =
  | 'COLLECTION_REQUESTED'
  | 'COLLECTION_SCHEDULED'
  | 'COLLECTION_COMPLETED'
  | 'COLLECTION_REFUSED'
  | 'COLLECTION_CANCELLED';

/**
 * Cópia/notificação para o síndico, VINCULADA à mesma solicitação de coleta
 * enviada à empresa. É informativa: não é uma segunda coleta operacional.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  /** Síndico que recebe a notificação. */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => CollectionRequest, { eager: true, onDelete: 'CASCADE' })
  collectionRequest: CollectionRequest;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ length: 120 })
  title: string;

  @Column({ length: 300 })
  message: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
