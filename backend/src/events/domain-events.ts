import type {
  CollectionRequest,
  CollectionRequestStatus,
} from '../collection-request/collection-request.entity';
import type { Sensor } from '../sensor/entities/sensor.entity';
import type { SensorReading } from '../sensor/entities/sensor-reading.entity';

/** Uma leitura do sensor (físico ou virtual) chegou e foi gravada. */
export const SENSOR_READING_RECEIVED = 'sensor.reading.received';
/** Uma solicitação de coleta foi criada (pelo listener do sensor, pela empresa ou no fluxo antigo). */
export const COLLECTION_REQUEST_CREATED = 'collection-request.created';
/** Uma solicitação mudou de status (iniciada, concluída, recusada, cancelada). */
export const COLLECTION_REQUEST_STATUS_CHANGED =
  'collection-request.status-changed';

export interface SensorReadingReceivedEvent {
  /** Sensor já carregado com barril, condomínio, síndico e empresa. */
  sensor: Sensor;
  reading: SensorReading;
}

export interface CollectionRequestCreatedEvent {
  request: CollectionRequest;
}

export interface CollectionRequestStatusChangedEvent {
  request: CollectionRequest;
  previousStatus: CollectionRequestStatus;
}

export type CollectionTriggerReason =
  | 'THRESHOLD_REACHED'
  | 'BELOW_THRESHOLD'
  | 'SENSOR_NOT_INSTALLED'
  | 'REQUEST_ALREADY_OPEN'
  | 'NO_COMPANY_LINKED';

/** Resultado devolvido pelo listener que avalia a leitura do sensor. */
export interface CollectionTriggerResult {
  kind: 'collection-trigger';
  triggered: boolean;
  reason: CollectionTriggerReason;
  /** Solicitação criada agora ou a que já estava aberta para o barril. */
  request: CollectionRequest | null;
}

export function isCollectionTriggerResult(
  value: unknown,
): value is CollectionTriggerResult {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as CollectionTriggerResult).kind === 'collection-trigger'
  );
}
