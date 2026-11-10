import {
  CollectionRequest,
  CollectionRequestOrigin,
  CollectionRequestStatus,
} from './collection-request.entity';

/**
 * Formato devolvido aos apps. Usa só os campos necessários
 * (sem senhas/hashes de usuário e empresa).
 */
export interface CollectionRequestView {
  id: number;
  status: CollectionRequestStatus;
  origin: CollectionRequestOrigin;
  levelAtRequest: number | null;
  requestedAt: Date;
  scheduledDate: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
  condominiumName: string | null;
  sensor: {
    id: number;
    sensorId: string;
    condominiumId: number | null;
    condominiumName: string | null;
    level: number;
    threshold: number;
  } | null;
  user: { id: number; name: string; email: string } | null;
  company: { id: number; name: string; iconeUrl: string | null } | null;
}

export function toRequestView(request: CollectionRequest): CollectionRequestView {
  const sensor = request.sensor ?? null;
  const condominium = sensor?.condominium ?? null;
  return {
    id: request.id,
    status: request.status,
    origin: request.origin ?? 'MANUAL',
    levelAtRequest: request.levelAtRequest ?? null,
    requestedAt: request.requestedAt,
    scheduledDate: request.scheduledDate ?? null,
    completedAt: request.completedAt ?? null,
    updatedAt: request.updatedAt ?? null,
    condominiumName: condominium?.name ?? null,
    sensor: sensor
      ? {
          id: sensor.id,
          sensorId: sensor.code,
          condominiumId: condominium?.id ?? null,
          condominiumName: condominium?.name ?? null,
          level: sensor.level,
          threshold: sensor.threshold,
        }
      : null,
    user: request.user
      ? { id: request.user.id, name: request.user.name, email: request.user.email }
      : null,
    company: request.company
      ? {
          id: request.company.id,
          name: request.company.name,
          iconeUrl: request.company.iconeUrl ?? null,
        }
      : null,
  };
}
