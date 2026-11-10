import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEventsService } from '../events/domain-events.service';
import {
  CollectionTriggerResult,
  SENSOR_READING_RECEIVED,
  SensorReadingReceivedEvent,
} from '../events/domain-events';
import { CollectionRequestService } from './collection-request.service';
import { evaluateCollectionTrigger } from './collection-trigger.rule';

/**
 * LISTENER do sensor: escuta cada leitura recebida pela API e, quando a regra
 * de disparo é atendida, ativa a criação da solicitação de coleta.
 * É o mesmo caminho para o sensor físico (ESP32) e para o sensor virtual.
 */
@Injectable()
export class SensorTriggerListener implements OnModuleInit {
  private readonly logger = new Logger(SensorTriggerListener.name);

  constructor(
    private readonly events: DomainEventsService,
    private readonly requests: CollectionRequestService,
  ) {}

  onModuleInit(): void {
    this.events.on<SensorReadingReceivedEvent>(SENSOR_READING_RECEIVED, (event) =>
      this.handle(event),
    );
  }

  async handle({
    sensor,
    reading,
  }: SensorReadingReceivedEvent): Promise<CollectionTriggerResult> {
    const open = await this.requests.findOpenForSensor(sensor.id);
    const decision = evaluateCollectionTrigger({
      level: reading.level,
      threshold: sensor.threshold,
      hasOpenRequest: !!open,
      hasCompany: !!sensor.condominium?.company,
    });

    if (!decision.create) {
      if (decision.reason === 'NO_COMPANY_LINKED') {
        this.logger.warn(
          `Sensor ${sensor.code} atingiu ${reading.level}%, mas o condomínio não tem empresa coletora vinculada.`,
        );
      }
      return {
        kind: 'collection-trigger',
        triggered: false,
        reason: decision.reason,
        request: open ?? null,
      };
    }

    const request = await this.requests.createFromSensor(sensor, reading.level);
    this.logger.log(
      `Sensor ${sensor.code} atingiu ${reading.level}% (limite ${sensor.threshold}%): solicitação #${request.id} criada.`,
    );
    return {
      kind: 'collection-trigger',
      triggered: true,
      reason: decision.reason,
      request,
    };
  }
}
