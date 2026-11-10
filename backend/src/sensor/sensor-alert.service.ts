import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './entities/sensor.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import { DomainEventsService } from '../events/domain-events.service';
import {
  CollectionTriggerReason,
  isCollectionTriggerResult,
  SENSOR_READING_RECEIVED,
  SensorReadingReceivedEvent,
} from '../events/domain-events';
import {
  normalizeSensorAlert,
  SensorAlertPayload,
} from './dto/sensor-alert.payload';
import { SensorService } from './sensor.service';
import { SensorView, toSensorView } from './sensor.view';
import {
  CollectionRequestView,
  toRequestView,
} from '../collection-request/collection-request.view';

export interface SensorAlertResult {
  reading: {
    id: number;
    sensorId: string;
    percentual: number;
    /** [compatibilidade] mesmo valor de percentual. */
    level: number;
    dataHora: string | null;
    receivedAt: Date;
  };
  sensor: SensorView;
  collection: {
    /** true quando ESTA leitura criou a solicitação de coleta. */
    triggered: boolean;
    reason: CollectionTriggerReason | null;
    /** Solicitação criada agora ou a que já estava aberta para o barril. */
    request: CollectionRequestView | null;
  };
}

/**
 * `SensorAlertService` do diagrama da API: o trigger principal.
 *
 * processarAlerta(payload) segue os passos do documento de classes:
 *  1. recebe o SensorAlertPayload do controller;
 *  2. busca o Sensor pelo sensorId (com barril, condomínio, síndico e empresa);
 *  3. atualiza o percentual atual e a data da última leitura;
 *  4. salva o sensor e grava a leitura no histórico;
 *  5–11. publica a leitura para o listener (SensorTriggerListener), que verifica o
 *     limite do barril e cria a CollectionRequest PENDING ligada à empresa, ao
 *     barril e ao sensor; em seguida o NotificationService avisa o síndico
 *     (cópia informativa) e a empresa coletora (nova solicitação).
 *
 * O caminho é o mesmo para o sensor físico (ESP32) e para o sensor virtual.
 */
@Injectable()
export class SensorAlertService {
  /** Fila por sensor: leituras simultâneas do mesmo sensor são tratadas uma de cada vez. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readonly readings: Repository<SensorReading>,
    private readonly sensorService: SensorService,
    private readonly events: DomainEventsService,
  ) {}

  async processarAlerta(payload: SensorAlertPayload): Promise<SensorAlertResult> {
    const alert = normalizeSensorAlert(payload);
    return this.enqueue(alert.sensorId, async () => {
      const sensor = await this.sensorService.findByCode(alert.sensorId);

      const receivedAt = new Date();
      await this.sensors.update(sensor.id, {
        level: alert.percentual,
        lastReadingAt: receivedAt,
      });
      sensor.level = alert.percentual;
      sensor.lastReadingAt = receivedAt;

      const reading = await this.readings.save(
        this.readings.create({
          sensor: { id: sensor.id } as Sensor,
          level: alert.percentual,
          deviceTimestamp: alert.dataHora,
        }),
      );

      const results = await this.events.emit<SensorReadingReceivedEvent>(
        SENSOR_READING_RECEIVED,
        { sensor, reading },
      );
      const trigger = results.find(isCollectionTriggerResult) ?? null;
      const request = trigger?.request ?? null;

      return {
        reading: {
          id: reading.id,
          sensorId: sensor.code,
          percentual: alert.percentual,
          level: alert.percentual,
          dataHora: alert.dataHora,
          receivedAt: reading.receivedAt,
        },
        sensor: toSensorView(sensor, request),
        collection: {
          triggered: trigger?.triggered ?? false,
          reason: trigger?.reason ?? null,
          request: request ? toRequestView(request) : null,
        },
      };
    });
  }

  private enqueue<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    const tail = run.catch(() => undefined);
    this.queues.set(key, tail);
    void tail.then(() => {
      if (this.queues.get(key) === tail) this.queues.delete(key);
    });
    return run;
  }
}
