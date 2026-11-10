import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { Notification, NotificationType } from './notification.entity';
import { NotificationView, toNotificationView } from './notification.view';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  /** Cria a cópia/notificação para o síndico da solicitação (se houver síndico). */
  async notifySindico(
    request: CollectionRequest,
    type: NotificationType,
  ): Promise<Notification | null> {
    if (!request.user) return null;
    const { title, message } = buildNotificationText(request, type);
    return this.notifications.save(
      this.notifications.create({
        user: { id: request.user.id },
        collectionRequest: { id: request.id },
        type,
        title,
        message,
        read: false,
      }),
    );
  }

  async listForUser(
    userId: number,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationView[]> {
    const list = await this.notifications.find({
      where: {
        user: { id: userId },
        ...(options.unreadOnly ? { read: false } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(options.limit ?? 50, 1), 200),
    });
    return list.map(toNotificationView);
  }

  async markRead(id: number, userId: number): Promise<NotificationView> {
    const notification = await this.notifications.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    if (!notification.read) {
      notification.read = true;
      await this.notifications.save(notification);
    }
    return toNotificationView(notification);
  }

  async markAllRead(userId: number): Promise<{ updated: number }> {
    const unread = await this.notifications.find({
      where: { user: { id: userId }, read: false },
      select: { id: true },
    });
    if (!unread.length) return { updated: 0 };
    await this.notifications.update(
      { id: In(unread.map((n) => n.id)) },
      { read: true },
    );
    return { updated: unread.length };
  }
}

function buildNotificationText(
  request: CollectionRequest,
  type: NotificationType,
): { title: string; message: string } {
  const condominium = request.sensor?.condominium?.name ?? 'seu condomínio';
  const company = request.company?.name ?? 'a empresa coletora';
  const level = request.levelAtRequest ?? request.sensor?.level;
  switch (type) {
    case 'COLLECTION_REQUESTED':
      return {
        title: 'Solicitação de coleta gerada',
        message:
          level !== undefined && level !== null
            ? `O barril de ${condominium} atingiu ${level}%. A solicitação #${request.id} foi enviada para ${company}.`
            : `A solicitação #${request.id} foi enviada para ${company}.`,
      };
    case 'COLLECTION_SCHEDULED':
      return {
        title: 'Coleta iniciada',
        message: `${company} iniciou a etapa de coleta da solicitação #${request.id}.`,
      };
    case 'COLLECTION_COMPLETED':
      return {
        title: 'Coleta concluída',
        message: `${company} concluiu a coleta da solicitação #${request.id}. O barril está disponível novamente.`,
      };
    case 'COLLECTION_REFUSED':
      return {
        title: 'Solicitação recusada',
        message: `${company} recusou a solicitação #${request.id}.`,
      };
    case 'COLLECTION_CANCELLED':
    default:
      return {
        title: 'Solicitação cancelada',
        message: `A solicitação #${request.id} foi cancelada.`,
      };
  }
}
