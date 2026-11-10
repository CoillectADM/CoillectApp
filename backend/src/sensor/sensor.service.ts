import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sensor } from './entities/sensor.entity';
import { SensorReading } from './entities/sensor-reading.entity';
import {
  CollectionRequest,
  OPEN_REQUEST_STATUSES,
} from '../collection-request/collection-request.entity';
import { DomainEventsService } from '../events/domain-events.service';
import {
  COLLECTION_REQUEST_STATUS_CHANGED,
  CollectionRequestStatusChangedEvent,
  CollectionTriggerReason,
  isCollectionTriggerResult,
  SENSOR_READING_RECEIVED,
  SensorReadingReceivedEvent,
} from '../events/domain-events';
import { SensorReadingDto } from './dto/sensor-reading.dto';
import { SensorView, toSensorView } from './sensor.view';
import {
  CollectionRequestView,
  toRequestView,
} from '../collection-request/collection-request.view';

/** Relações necessárias para montar a visão do sensor e disparar a coleta. */
export const SENSOR_RELATIONS = {
  condominium: { company: true, sindico: true },
} as const;

export interface SensorReadingResult {
  reading: { id: number; sensorId: string; level: number; receivedAt: Date };
  sensor: SensorView;
  collection: {
    /** true quando ESTA leitura criou a solicitação de coleta. */
    triggered: boolean;
    reason: CollectionTriggerReason | null;
    /** Solicitação criada agora ou a que já estava aberta para o sensor. */
    request: CollectionRequestView | null;
  };
}

@Injectable()
export class SensorService implements OnModuleInit {
  private readonly logger = new Logger(SensorService.name);
  /** Fila por sensor: leituras simultâneas do mesmo sensor são tratadas uma de cada vez. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readonly readings: Repository<SensorReading>,
    @InjectRepository(CollectionRequest)
    private readonly requests: Repository<CollectionRequest>,
    private readonly events: DomainEventsService,
  ) {}

  onModuleInit(): void {
    // Coleta concluída → barril esvaziado: volta a 0% até a próxima leitura do sensor.
    this.events.on<CollectionRequestStatusChangedEvent>(
      COLLECTION_REQUEST_STATUS_CHANGED,
      (event) => this.onRequestStatusChanged(event),
    );
  }

  /**
   * Recebe a leitura do sensor (físico ou virtual), atualiza o barril, grava o
   * histórico e publica o evento que o listener usa para decidir a coleta.
   */
  async registerReading(dto: SensorReadingDto): Promise<SensorReadingResult> {
    const code = dto.sensorId.trim();
    return this.enqueue(code, async () => {
      const sensor = await this.sensors.findOne({
        where: { code },
        relations: SENSOR_RELATIONS,
      });
      if (!sensor) {
        throw new NotFoundException(
          `Sensor "${code}" não cadastrado. Cadastre-o em POST /api/admin/sensors.`,
        );
      }

      const level = Math.round(dto.level);
      const receivedAt = new Date();
      await this.sensors.update(sensor.id, { level, lastReadingAt: receivedAt });
      sensor.level = level;
      sensor.lastReadingAt = receivedAt;

      const reading = await this.readings.save(
        this.readings.create({ sensor: { id: sensor.id } as Sensor, level }),
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
          level,
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

  /** Barril do condomínio do síndico logado (null se ainda não houver vínculo). */
  async findForSindico(userId: number): Promise<SensorView | null> {
    const sensor = await this.sensors.findOne({
      where: { condominium: { sindico: { id: userId } } },
      relations: SENSOR_RELATIONS,
      order: { id: 'ASC' },
    });
    if (!sensor) return null;
    const [view] = await this.withOpenRequests([sensor]);
    return view;
  }

  /** Barris dos condomínios clientes da empresa logada. */
  async findForCompany(companyId: number): Promise<SensorView[]> {
    const list = await this.sensors.find({
      where: { condominium: { company: { id: companyId } } },
      relations: SENSOR_RELATIONS,
      order: { code: 'ASC' },
    });
    return this.withOpenRequests(list);
  }

  async findAllViews(): Promise<SensorView[]> {
    const list = await this.sensors.find({
      relations: SENSOR_RELATIONS,
      order: { code: 'ASC' },
    });
    return this.withOpenRequests(list);
  }

  async findViewByCode(code: string): Promise<SensorView> {
    const sensor = await this.sensors.findOne({
      where: { code },
      relations: SENSOR_RELATIONS,
    });
    if (!sensor) {
      throw new NotFoundException(`Sensor "${code}" não cadastrado.`);
    }
    const [view] = await this.withOpenRequests([sensor]);
    return view;
  }

  private async withOpenRequests(list: Sensor[]): Promise<SensorView[]> {
    if (!list.length) return [];
    const open = await this.requests.find({
      where: {
        sensor: { id: In(list.map((s) => s.id)) },
        status: In(OPEN_REQUEST_STATUSES),
      },
      order: { requestedAt: 'DESC' },
    });
    return list.map((sensor) =>
      toSensorView(
        sensor,
        open.find((request) => request.sensor?.id === sensor.id) ?? null,
      ),
    );
  }

  private async onRequestStatusChanged({
    request,
  }: CollectionRequestStatusChangedEvent): Promise<void> {
    if (request.status !== 'COMPLETED' || !request.sensor) return;
    await this.sensors.update(request.sensor.id, {
      level: 0,
      lastCollectionAt: request.completedAt ?? new Date(),
    });
    this.logger.log(
      `Coleta #${request.id} concluída: barril ${request.sensor.code} voltou a 0%.`,
    );
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
