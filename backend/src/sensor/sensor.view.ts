import { CollectionRequest } from '../collection-request/collection-request.entity';
import { Sensor } from './entities/sensor.entity';
import { condominiumOf, isOnline, thresholdOf } from './sensor-links';

/**
 * Formato do barril/sensor devolvido aos três apps
 * (sensor/mine, sensor/company e admin/overview usam o mesmo formato).
 * Os campos "planos" (threshold, capacityLiters...) foram mantidos para os apps
 * que já existem; os novos (barrelCode, condominiumNeighborhood, online) são opcionais.
 */
export interface SensorView {
  id: number;
  sensorId: string;
  barrelId: number | null;
  barrelCode: string | null;
  condominiumId: number | null;
  condominiumName: string | null;
  condominiumAddress: string | null;
  condominiumNeighborhood: string | null;
  companyId: number | null;
  companyName: string | null;
  sindicoName: string | null;
  level: number;
  threshold: number;
  capacityLiters: number | null;
  estimatedLiters: number | null;
  needsCollection: boolean;
  /** Recebeu leitura dentro da janela SENSOR_ONLINE_MINUTES (padrão 30 min). */
  online: boolean;
  lastReadingAt: Date | null;
  lastCollectionAt: Date | null;
  openRequest: { id: number; status: string; requestedAt: Date } | null;
}

export function toSensorView(
  sensor: Sensor,
  openRequest: CollectionRequest | null = null,
  now: Date = new Date(),
): SensorView {
  const barrel = sensor.barrel ?? null;
  const condominium = condominiumOf(sensor);
  const threshold = thresholdOf(sensor);
  const capacity = barrel?.capacityLiters ?? null;
  return {
    id: sensor.id,
    sensorId: sensor.code,
    barrelId: barrel?.id ?? null,
    barrelCode: barrel?.code ?? null,
    condominiumId: condominium?.id ?? null,
    condominiumName: condominium?.name ?? null,
    condominiumAddress: condominium?.address ?? null,
    condominiumNeighborhood: condominium?.neighborhood ?? null,
    companyId: condominium?.company?.id ?? null,
    companyName: condominium?.company?.name ?? null,
    sindicoName: condominium?.sindico?.name ?? null,
    level: sensor.level,
    threshold,
    capacityLiters: capacity,
    estimatedLiters:
      capacity === null ? null : Math.round((capacity * sensor.level) / 100),
    needsCollection: sensor.level >= threshold,
    online: isOnline(sensor, now),
    lastReadingAt: sensor.lastReadingAt ?? null,
    lastCollectionAt: barrel?.lastCollectionAt ?? null,
    openRequest: openRequest
      ? {
          id: openRequest.id,
          status: openRequest.status,
          requestedAt: openRequest.requestedAt,
        }
      : null,
  };
}
