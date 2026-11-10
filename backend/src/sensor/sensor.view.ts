import { CollectionRequest } from '../collection-request/collection-request.entity';
import { Sensor } from './entities/sensor.entity';

/**
 * Formato do barril/sensor devolvido aos três apps
 * (sensor/mine, sensor/company e admin/overview usam o mesmo formato).
 */
export interface SensorView {
  id: number;
  sensorId: string;
  condominiumId: number | null;
  condominiumName: string | null;
  condominiumAddress: string | null;
  companyId: number | null;
  companyName: string | null;
  sindicoName: string | null;
  level: number;
  threshold: number;
  capacityLiters: number | null;
  estimatedLiters: number | null;
  needsCollection: boolean;
  lastReadingAt: Date | null;
  lastCollectionAt: Date | null;
  openRequest: { id: number; status: string; requestedAt: Date } | null;
}

export function toSensorView(
  sensor: Sensor,
  openRequest: CollectionRequest | null = null,
): SensorView {
  const condominium = sensor.condominium ?? null;
  const capacity = sensor.capacityLiters ?? null;
  return {
    id: sensor.id,
    sensorId: sensor.code,
    condominiumId: condominium?.id ?? null,
    condominiumName: condominium?.name ?? null,
    condominiumAddress: condominium?.address ?? null,
    companyId: condominium?.company?.id ?? null,
    companyName: condominium?.company?.name ?? null,
    sindicoName: condominium?.sindico?.name ?? null,
    level: sensor.level,
    threshold: sensor.threshold,
    capacityLiters: capacity,
    estimatedLiters:
      capacity === null ? null : Math.round((capacity * sensor.level) / 100),
    needsCollection: sensor.level >= sensor.threshold,
    lastReadingAt: sensor.lastReadingAt ?? null,
    lastCollectionAt: sensor.lastCollectionAt ?? null,
    openRequest: openRequest
      ? {
          id: openRequest.id,
          status: openRequest.status,
          requestedAt: openRequest.requestedAt,
        }
      : null,
  };
}
