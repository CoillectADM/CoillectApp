import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventsService } from '../events/domain-events.service';
import {
  CollectionTriggerResult,
  SENSOR_READING_RECEIVED,
  SensorReadingReceivedEvent,
} from '../events/domain-events';
import { CollectionRequestService } from './collection-request.service';
import { evaluateCollectionTrigger } from './collection-trigger.rule';
import { condominiumOf, thresholdOf } from '../sensor/sensor-links';
import { Barrel } from '../sensor/entities/barrel.entity';

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
    @InjectRepository(Barrel) private readonly barrels: Repository<Barrel>,
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
    const barrel = sensor.barrel ?? null;
    const threshold = thresholdOf(sensor);
    // Leitura abaixo do limite depois de uma coleta: o barril foi esvaziado de fato.
    if (barrel?.awaitingEmptyReading && reading.level < threshold) {
      await this.barrels.update(barrel.id, { awaitingEmptyReading: false });
      barrel.awaitingEmptyReading = false;
    }
    const open = barrel ? await this.requests.findOpenForBarrel(barrel.id) : null;
    const decision = evaluateCollectionTrigger({
      level: reading.level,
      threshold,
      hasBarrel: !!barrel,
      hasOpenRequest: !!open,
      hasCompany: !!condominiumOf(sensor)?.company,
      awaitingEmptyReading: !!barrel?.awaitingEmptyReading,
    });

    if (!decision.create) {
      if (decision.reason === 'NO_COMPANY_LINKED') {
        this.logger.warn(
          `Sensor ${sensor.code} atingiu ${reading.level}%, mas o condomínio do barril não tem empresa coletora vinculada.`,
        );
      }
      if (decision.reason === 'AWAITING_EMPTY_READING') {
        this.logger.log(
          `Sensor ${sensor.code} leu ${reading.level}% logo após a coleta do barril ${barrel?.code}: aguardando a leitura do barril vazio para abrir outra solicitação.`,
        );
      }
      if (decision.reason === 'SENSOR_NOT_INSTALLED') {
        this.logger.warn(
          `Sensor ${sensor.code} atingiu ${reading.level}%, mas não está instalado em nenhum barril.`,
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
      `Sensor ${sensor.code} atingiu ${reading.level}% (limite ${threshold}% do barril ${barrel?.code}): solicitação #${request.id} criada.`,
    );
    return {
      kind: 'collection-trigger',
      triggered: true,
      reason: decision.reason,
      request,
    };
  }
}
