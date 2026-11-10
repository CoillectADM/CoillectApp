import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sensor } from './entities/sensor.entity';
import { Barrel } from './entities/barrel.entity';
import {
  CollectionRequest,
  OPEN_REQUEST_STATUSES,
} from '../collection-request/collection-request.entity';
import { DomainEventsService } from '../events/domain-events.service';
import {
  COLLECTION_REQUEST_STATUS_CHANGED,
  CollectionRequestStatusChangedEvent,
} from '../events/domain-events';
import { SensorView, toSensorView } from './sensor.view';
import { SENSOR_RELATIONS } from './sensor-links';

/**
 * Consultas de sensores/barris para os apps (papel do `SensorRepository` do
 * diagrama) e atualização do barril quando a coleta é concluída.
 * O recebimento da leitura do sensor fica no SensorAlertService.
 */
@Injectable()
export class SensorService implements OnModuleInit {
  private readonly logger = new Logger(SensorService.name);

  constructor(
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
    @InjectRepository(Barrel) private readonly barrels: Repository<Barrel>,
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

  /** `SensorRepository.buscarPorId(sensorId)`: sensor com barril, condomínio, síndico e empresa. */
  async findByCode(code: string): Promise<Sensor> {
    const sensor = await this.sensors.findOne({
      where: { code },
      relations: SENSOR_RELATIONS,
    });
    if (!sensor) {
      throw new NotFoundException(
        `Sensor "${code}" não cadastrado. Cadastre-o em POST /api/admin/sensors.`,
      );
    }
    return sensor;
  }

  /** Barril do condomínio do síndico logado (null se ainda não houver vínculo). */
  async findForSindico(userId: number): Promise<SensorView | null> {
    const sensor = await this.sensors.findOne({
      where: { barrel: { condominium: { sindico: { id: userId } } } },
      relations: SENSOR_RELATIONS,
      order: { id: 'ASC' },
    });
    if (!sensor) return null;
    const [view] = await this.toViews([sensor]);
    return view;
  }

  /** Barris dos condomínios clientes da empresa logada. */
  async findForCompany(companyId: number): Promise<SensorView[]> {
    const list = await this.sensors.find({
      where: { barrel: { condominium: { company: { id: companyId } } } },
      relations: SENSOR_RELATIONS,
      order: { code: 'ASC' },
    });
    return this.toViews(list);
  }

  async findAllViews(): Promise<SensorView[]> {
    const list = await this.sensors.find({
      relations: SENSOR_RELATIONS,
      order: { code: 'ASC' },
    });
    return this.toViews(list);
  }

  async findViewByCode(code: string): Promise<SensorView> {
    const [view] = await this.toViews([await this.findByCode(code)]);
    return view;
  }

  /** Monta as visões incluindo a solicitação aberta (PENDING/SCHEDULED) de cada barril. */
  async toViews(list: Sensor[]): Promise<SensorView[]> {
    if (!list.length) return [];
    const barrelIds = list
      .map((sensor) => sensor.barrel?.id)
      .filter((id): id is number => typeof id === 'number');
    const open = barrelIds.length
      ? await this.requests.find({
          where: {
            barrel: { id: In(barrelIds) },
            status: In(OPEN_REQUEST_STATUSES),
          },
          order: { requestedAt: 'DESC' },
        })
      : [];
    const now = new Date();
    return list.map((sensor) =>
      toSensorView(
        sensor,
        open.find(
          (request) =>
            !!sensor.barrel && request.barrel?.id === sensor.barrel.id,
        ) ?? null,
        now,
      ),
    );
  }

  private async onRequestStatusChanged({
    request,
  }: CollectionRequestStatusChangedEvent): Promise<void> {
    if (request.status !== 'COMPLETED') return;
    const barrelId = request.barrel?.id ?? request.sensor?.barrel?.id;
    if (!barrelId) return;
    await this.barrels.update(barrelId, {
      lastCollectionAt: request.completedAt ?? new Date(),
      awaitingEmptyReading: true,
    });
    const installed = await this.sensors.find({
      where: { barrel: { id: barrelId } },
    });
    if (installed.length) {
      await this.sensors.update(
        { id: In(installed.map((sensor) => sensor.id)) },
        { level: 0 },
      );
    }
    this.logger.log(
      `Coleta #${request.id} concluída: barril ${request.barrel?.code ?? barrelId} voltou a 0%.`,
    );
  }
}
