import {
  CollectionRequest,
  CollectionRequestOrigin,
  CollectionRequestStatus,
} from './collection-request.entity';
import { DEFAULT_ALERT_THRESHOLD } from '../sensor/entities/barrel.entity';

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
  /** true quando o comprovante da coleta já está no Blob Storage. */
  receiptAvailable: boolean;
  /** Nome do comprovante no container "comprovantes-coleta" (null até a conclusão). */
  receiptBlob: string | null;
  condominiumName: string | null;
  condominiumNeighborhood: string | null;
  /** Barril específico que a empresa deve coletar. */
  barrel: {
    id: number;
    code: string;
    capacityLiters: number | null;
    threshold: number;
  } | null;
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
  /** Campos antigos, mantidos para o frontend web existente. */
  userCpfSnapshot: string | null;
  companyCnpjSnapshot: string | null;
  userAddressSnapshot: string | null;
}

export function toRequestView(request: CollectionRequest): CollectionRequestView {
  const sensor = request.sensor ?? null;
  const barrel = request.barrel ?? sensor?.barrel ?? null;
  const condominium = barrel?.condominium ?? null;
  const threshold = barrel?.alertThreshold ?? DEFAULT_ALERT_THRESHOLD;
  return {
    id: request.id,
    status: request.status,
    origin: request.origin ?? 'MANUAL',
    levelAtRequest: request.levelAtRequest ?? null,
    requestedAt: request.requestedAt,
    scheduledDate: request.scheduledDate ?? null,
    completedAt: request.completedAt ?? null,
    updatedAt: request.updatedAt ?? null,
    receiptAvailable: !!request.receiptBlob,
    receiptBlob: request.receiptBlob ?? null,
    condominiumName: condominium?.name ?? null,
    condominiumNeighborhood: condominium?.neighborhood ?? null,
    barrel: barrel
      ? {
          id: barrel.id,
          code: barrel.code,
          capacityLiters: barrel.capacityLiters ?? null,
          threshold,
        }
      : null,
    sensor: sensor
      ? {
          id: sensor.id,
          sensorId: sensor.code,
          condominiumId: condominium?.id ?? null,
          condominiumName: condominium?.name ?? null,
          level: sensor.level,
          threshold,
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
    userCpfSnapshot: request.userCpfSnapshot ?? null,
    companyCnpjSnapshot: request.companyCnpjSnapshot ?? null,
    userAddressSnapshot: request.userAddressSnapshot ?? null,
  };
}
