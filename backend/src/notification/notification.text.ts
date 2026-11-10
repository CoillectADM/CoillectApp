import { CollectionRequest } from '../collection-request/collection-request.entity';
import { NotificationType } from './notification.entity';

export interface NotificationText {
  title: string;
  message: string;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

function describe(request: CollectionRequest) {
  const barrel = request.barrel ?? request.sensor?.barrel ?? null;
  return {
    condominium: barrel?.condominium?.name ?? null,
    barrel: barrel?.code ?? null,
    company: request.company?.name ?? 'a empresa coletora',
    level: request.levelAtRequest ?? request.sensor?.level ?? null,
    date: formatDate(request.scheduledDate),
  };
}

/** Texto da cópia/notificação do SÍNDICO (informativa). */
export function sindicoNotificationText(
  request: CollectionRequest,
  type: NotificationType,
): NotificationText {
  const d = describe(request);
  const where = d.condominium ? `de ${d.condominium}` : 'do seu condomínio';
  const barrel = d.barrel ? `O barril ${d.barrel} ${where}` : `O barril ${where}`;
  switch (type) {
    case 'COLLECTION_REQUESTED':
      return {
        title: 'Coleta solicitada automaticamente',
        message:
          d.level !== null
            ? `${barrel} atingiu ${d.level}%. A solicitação #${request.id} foi enviada para ${d.company}.`
            : `A solicitação #${request.id} foi enviada para ${d.company}.`,
      };
    case 'COLLECTION_SCHEDULED':
      return {
        title: 'Coleta agendada',
        message: `${d.company} agendou a coleta${d.barrel ? ` do barril ${d.barrel}` : ''}${d.date ? ` para ${d.date}` : ''} (solicitação #${request.id}).`,
      };
    case 'COLLECTION_COMPLETED':
      return {
        title: 'Coleta concluída',
        message: `${d.company} concluiu a coleta da solicitação #${request.id}. O barril está disponível novamente.`,
      };
    case 'COLLECTION_REFUSED':
      return {
        title: 'Solicitação recusada',
        message: `${d.company} recusou a solicitação #${request.id}.`,
      };
    case 'COLLECTION_CANCELLED':
    default:
      return {
        title: 'Solicitação cancelada',
        message: `A solicitação #${request.id} foi cancelada.`,
      };
  }
}

/** Texto do aviso da EMPRESA coletora (faixa "Nova solicitação de coleta" do app). */
export function empresaNotificationText(
  request: CollectionRequest,
  type: NotificationType,
): NotificationText {
  const d = describe(request);
  const place = d.condominium ?? 'Um condomínio cliente';
  switch (type) {
    case 'COLLECTION_REQUESTED':
      return {
        title: 'Nova solicitação de coleta',
        message:
          request.origin === 'MANUAL'
            ? `${request.user?.name ?? 'Um síndico'} pediu uma coleta (solicitação #${request.id}).`
            : `${place} chegou a ${d.level ?? '?'}% de capacidade.${d.barrel ? ` Barril ${d.barrel}.` : ''}`,
      };
    case 'COLLECTION_CANCELLED':
      return {
        title: 'Solicitação cancelada',
        message: `A solicitação #${request.id}${d.condominium ? ` de ${d.condominium}` : ''} foi cancelada pelo síndico.`,
      };
    default:
      return sindicoNotificationText(request, type);
  }
}
