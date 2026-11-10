import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { Notification, NotificationType } from './notification.entity';
import { NotificationView, toNotificationView } from './notification.view';
import {
  HelpRequestText,
  empresaNotificationText,
  helpNotificationTexts,
  sindicoNotificationText,
} from './notification.text';

/** Destinatário: síndico (userId) ou empresa coletora (companyId). */
export type NotificationRecipient = { userId: number } | { companyId: number };

/**
 * `NotificationService` do diagrama da API:
 *  - notificarSindico: cópia informativa da solicitação (o síndico só acompanha);
 *  - notificarEmpresa: aviso de nova solicitação para a empresa coletora.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async notificarSindico(
    request: CollectionRequest,
    type: NotificationType,
    dedupeKey?: string,
  ): Promise<Notification | null> {
    if (!request.user) return null;
    const { title, message } = sindicoNotificationText(request, type);
    return this.saveOnce(
      {
        audience: 'SINDICO',
        user: { id: request.user.id } as Notification['user'],
        company: null,
        collectionRequest: { id: request.id } as CollectionRequest,
        type,
        title,
        message,
        read: false,
      },
      dedupeKey,
    );
  }

  async notificarEmpresa(
    request: CollectionRequest,
    type: NotificationType,
    dedupeKey?: string,
  ): Promise<Notification | null> {
    if (!request.company) return null;
    const { title, message } = empresaNotificationText(request, type);
    return this.saveOnce(
      {
        audience: 'EMPRESA',
        user: null,
        company: { id: request.company.id } as Notification['company'],
        collectionRequest: { id: request.id } as CollectionRequest,
        type,
        title,
        message,
        read: false,
      },
      dedupeKey,
    );
  }

  /**
   * "Precisa de ajuda?": aviso para a empresa coletora do condomínio e
   * confirmação para o síndico. Não cria solicitação de coleta.
   */
  async notificarAjuda(
    input: HelpRequestText & { sindicoId: number; companyId: number },
    dedupeKey?: string,
  ): Promise<void> {
    const texts = helpNotificationTexts(input);
    await this.saveOnce(
      {
        audience: 'EMPRESA',
        user: null,
        company: { id: input.companyId } as Notification['company'],
        collectionRequest: null,
        type: 'HELP_REQUESTED',
        ...texts.empresa,
        read: false,
      },
      dedupeKey ? `${dedupeKey}:EMPRESA` : undefined,
    );
    await this.saveOnce(
      {
        audience: 'SINDICO',
        user: { id: input.sindicoId } as Notification['user'],
        company: null,
        collectionRequest: null,
        type: 'HELP_REQUESTED',
        ...texts.sindico,
        read: false,
      },
      dedupeKey ? `${dedupeKey}:SINDICO` : undefined,
    );
  }

  /** Grava uma vez só por chave de idempotência (mensagem repetida da fila). */
  private async saveOnce(
    data: Partial<Notification>,
    dedupeKey?: string,
  ): Promise<Notification> {
    if (dedupeKey) {
      const existing = await this.notifications.findOne({ where: { dedupeKey } });
      if (existing) return existing;
    }
    try {
      return await this.notifications.save(
        this.notifications.create({ ...data, dedupeKey: dedupeKey ?? null }),
      );
    } catch (error) {
      // 23505 = unique_violation: outra instância gravou a mesma mensagem agora.
      if (dedupeKey && (error as { code?: string })?.code === '23505') {
        const existing = await this.notifications.findOne({ where: { dedupeKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async list(
    recipient: NotificationRecipient,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationView[]> {
    const list = await this.notifications.find({
      where: {
        ...whereRecipient(recipient),
        ...(options.unreadOnly ? { read: false } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(options.limit ?? 50, 1), 200),
    });
    return list.map(toNotificationView);
  }

  async markRead(
    id: number,
    recipient: NotificationRecipient,
  ): Promise<NotificationView> {
    const notification = await this.notifications.findOne({
      where: { id, ...whereRecipient(recipient) },
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

  async markAllRead(
    recipient: NotificationRecipient,
  ): Promise<{ updated: number }> {
    const unread = await this.notifications.find({
      where: { ...whereRecipient(recipient), read: false },
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

function whereRecipient(
  recipient: NotificationRecipient,
): FindOptionsWhere<Notification> {
  return 'userId' in recipient
    ? { audience: 'SINDICO', user: { id: recipient.userId } }
    : { audience: 'EMPRESA', company: { id: recipient.companyId } };
}
