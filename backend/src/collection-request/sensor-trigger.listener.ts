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
import { barrelKey, barrelLock } from './barrel-lock';

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

  /**
   * Leituras do MESMO barril são avaliadas uma por vez (barrelLock): com vários
   * clientes enviando ao mesmo tempo, só a primeira leitura no limite cria a
   * solicitação; as outras já a encontram aberta.
   */
  async handle(event: SensorReadingReceivedEvent): Promise<CollectionTriggerResult> {
    const barrelId = event.sensor.barrel?.id;
    if (barrelId == null) return this.evaluate(event);
    return barrelLock.run(barrelKey(barrelId), () => this.evaluate(event));
  }

  private async evaluate({
    sensor,
    reading,
  }: SensorReadingReceivedEvent): Promise<CollectionTriggerResult> {
    const barrel = sensor.barrel ?? null;
    const threshold = thresholdOf(sensor);
    if (barrel) {
      // Relê a marca dentro da trava: outra leitura pode tê-la mudado agora há pouco.
      const fresh = await this.barrels.findOne({ where: { id: barrel.id } });
      if (fresh) barrel.awaitingEmptyReading = fresh.awaitingEmptyReading;
    }
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
