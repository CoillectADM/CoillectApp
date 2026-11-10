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
 * Gera a cópia/notificação do síndico sempre que a solicitação é criada ou muda
 * de status. Falhas aqui não desfazem a solicitação principal da empresa.
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
      ({ request }) => this.notify(request, 'COLLECTION_REQUESTED'),
    );
    this.events.on<CollectionRequestStatusChangedEvent>(
      COLLECTION_REQUEST_STATUS_CHANGED,
      ({ request }) => {
        const type = TYPE_BY_STATUS[request.status];
        return type ? this.notify(request, type) : undefined;
      },
    );
  }

  private async notify(
    request: CollectionRequest,
    type: NotificationType,
  ): Promise<void> {
    try {
      await this.notifications.notifySindico(request, type);
    } catch (error) {
      this.logger.error(
        `Falha ao notificar o síndico da solicitação #${request.id}: ${error}`,
      );
    }
  }
}
