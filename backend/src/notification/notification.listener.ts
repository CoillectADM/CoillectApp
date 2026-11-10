import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEventsService } from '../events/domain-events.service';
import {
  COLLECTION_REQUEST_CREATED,
  COLLECTION_REQUEST_STATUS_CHANGED,
  CollectionRequestCreatedEvent,
  CollectionRequestStatusChangedEvent,
} from '../events/domain-events';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { NotificationType } from './notification.entity';
import { NotificationService } from './notification.service';

const TYPE_BY_STATUS: Partial<Record<string, NotificationType>> = {
  SCHEDULED: 'COLLECTION_SCHEDULED',
  COMPLETED: 'COLLECTION_COMPLETED',
  REFUSED: 'COLLECTION_REFUSED',
  CANCELLED: 'COLLECTION_CANCELLED',
};

/**
 * Gera as notificações sempre que a solicitação é criada ou muda de status:
 *  - síndico: cópia informativa de tudo o que acontece com a coleta;
 *  - empresa: aviso de nova solicitação (sensor ou fluxo antigo) e de cancelamento.
 * Falhas aqui não desfazem a solicitação principal da empresa.
 */
@Injectable()
export class NotificationListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly events: DomainEventsService,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit(): void {
    this.events.on<CollectionRequestCreatedEvent>(
      COLLECTION_REQUEST_CREATED,
      ({ request }) => this.onCreated(request),
    );
    this.events.on<CollectionRequestStatusChangedEvent>(
      COLLECTION_REQUEST_STATUS_CHANGED,
      ({ request }) => this.onStatusChanged(request),
    );
  }

  private async onCreated(request: CollectionRequest): Promise<void> {
    if (request.origin === 'COMPANY') {
      // A própria empresa agendou: só o síndico precisa saber.
      await this.safely(request, 'síndico', () =>
        this.notifications.notificarSindico(request, 'COLLECTION_SCHEDULED'),
      );
      return;
    }
    await this.safely(request, 'síndico', () =>
      this.notifications.notificarSindico(request, 'COLLECTION_REQUESTED'),
    );
    await this.safely(request, 'empresa', () =>
      this.notifications.notificarEmpresa(request, 'COLLECTION_REQUESTED'),
    );
  }

  private async onStatusChanged(request: CollectionRequest): Promise<void> {
    const type = TYPE_BY_STATUS[request.status];
    if (!type) return;
    await this.safely(request, 'síndico', () =>
      this.notifications.notificarSindico(request, type),
    );
    if (request.status === 'CANCELLED') {
      await this.safely(request, 'empresa', () =>
        this.notifications.notificarEmpresa(request, type),
      );
    }
  }

  private async safely(
    request: CollectionRequest,
    who: string,
    work: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(
        `Falha ao notificar ${who} da solicitação #${request.id}: ${error}`,
      );
    }
  }
}
