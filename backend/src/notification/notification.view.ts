import {
  CollectionRequestView,
  toRequestView,
} from '../collection-request/collection-request.view';
import { Notification, NotificationType } from './notification.entity';

export interface NotificationView {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  requestId: number | null;
  /** A mesma solicitação que a empresa recebeu (cópia informativa). */
  request: CollectionRequestView | null;
}

export function toNotificationView(notification: Notification): NotificationView {
  const request = notification.collectionRequest ?? null;
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt,
    requestId: request?.id ?? null,
    request: request ? toRequestView(request) : null,
  };
}
