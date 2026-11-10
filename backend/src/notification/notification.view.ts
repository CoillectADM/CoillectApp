import {
  CollectionRequestView,
  toRequestView,
} from '../collection-request/collection-request.view';
import {
  Notification,
  NotificationAudience,
  NotificationType,
} from './notification.entity';

export interface NotificationView {
  id: number;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  requestId: number | null;
  /** A mesma solicitação de coleta (para o síndico, cópia informativa). */
  request: CollectionRequestView | null;
}

export function toNotificationView(notification: Notification): NotificationView {
  const request = notification.collectionRequest ?? null;
  return {
    id: notification.id,
    audience: notification.audience ?? 'SINDICO',
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt,
    requestId: request?.id ?? null,
    request: request ? toRequestView(request) : null,
  };
}
