import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CollectionRequestRepository } from './repository/collection-request.repository';
import { CreateCollectionRequestDto } from '../collection-request/dto/create-collection-request.dto';
import { UserService } from 'src/user/user.service';
import { CompanyService } from 'src/company/company.service';
import {
  CollectionRequest,
  CollectionRequestStatus,
  OPEN_REQUEST_STATUSES,
} from './collection-request.entity';
import { DomainEventsService } from 'src/events/domain-events.service';
import {
  COLLECTION_REQUEST_CREATED,
  COLLECTION_REQUEST_STATUS_CHANGED,
  CollectionRequestCreatedEvent,
  CollectionRequestStatusChangedEvent,
} from 'src/events/domain-events';
import { Sensor } from 'src/sensor/entities/sensor.entity';
import { Barrel } from 'src/sensor/entities/barrel.entity';
import { condominiumOf } from 'src/sensor/sensor-links';
import { ScheduleCollectionDto } from './dto/schedule-collection.dto';

const CLOSED_STATUSES: CollectionRequestStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REFUSED',
];

@Injectable()
export class CollectionRequestService {
  constructor(
    private readonly collectionRepo: CollectionRequestRepository,
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
    private readonly events: DomainEventsService,
    @InjectRepository(Barrel) private readonly barrels: Repository<Barrel>,
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
  ) {}

  // ---------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------

  /** Fluxo antigo: o próprio usuário pede a coleta escolhendo a empresa. */
  async createForUser(
    userId: number,
    dto: CreateCollectionRequestDto,
  ): Promise<CollectionRequest> {
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const company = await this.companyService.findById(dto.companyId);
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.createRequest({
      user,
      company,
      status: 'PENDING',
      origin: 'MANUAL',
      scheduledDate: null,
      userCpfSnapshot: null,
      companyCnpjSnapshot: company.cnpj,
      userAddressSnapshot: null,
    });
  }

  /**
   * Fluxo do MVP: chamado pelo listener quando a leitura do sensor atinge o limite.
   * Cria a solicitação PRINCIPAL para a empresa do condomínio, ligada ao barril e
   * ao sensor; o síndico recebe uma cópia/notificação vinculada a esta mesma
   * solicitação (sem duplicar a coleta).
   * O sensor deve vir carregado com barrel.condominium.company e .sindico.
   */
  async createFromSensor(
    sensor: Sensor,
    level: number,
  ): Promise<CollectionRequest> {
    const condominium = condominiumOf(sensor);
    return this.createRequest({
      user: condominium?.sindico ?? null,
      company: condominium?.company ?? null,
      barrel: sensor.barrel ? ({ id: sensor.barrel.id } as Barrel) : null,
      sensor: { id: sensor.id } as Sensor,
      status: 'PENDING',
      origin: 'SENSOR',
      levelAtRequest: level,
      scheduledDate: null,
      userCpfSnapshot: null,
      companyCnpjSnapshot: condominium?.company?.cnpj ?? null,
      userAddressSnapshot: condominium?.address ?? null,
    });
  }

  /**
   * "Agendar coleta" no app da empresa, para um barril específico:
   *  - se o barril já tem solicitação PENDING desta empresa, ela é aceita (→ SCHEDULED);
   *  - se já está SCHEDULED, só a data é atualizada (quando enviada);
   *  - se não há solicitação aberta, cria uma nova (origem COMPANY) já SCHEDULED.
   * O síndico recebe a notificação; nunca há duas coletas abertas para o mesmo barril.
   */
  async scheduleByCompany(
    companyId: number,
    dto: ScheduleCollectionDto,
  ): Promise<CollectionRequest> {
    const barrel = await this.findBarrelForCompany(companyId, dto);
    const scheduledDate = dto.scheduledDate
      ? new Date(dto.scheduledDate)
      : undefined;

    const open = await this.findOpenForBarrel(barrel.id);
    if (open) {
      if (open.company?.id !== companyId) {
        throw new ConflictException(
          `O barril ${barrel.code} já tem a solicitação #${open.id} aberta com outra empresa.`,
        );
      }
      if (open.status === 'PENDING') {
        return this.transition(open, 'SCHEDULED', {
          scheduledDate: scheduledDate ?? new Date(),
        });
      }
      return scheduledDate
        ? this.transition(open, 'SCHEDULED', { scheduledDate })
        : open;
    }

    const condominium = barrel.condominium;
    const sensor = await this.sensors.findOne({
      where: { barrel: { id: barrel.id } },
      order: { id: 'ASC' },
    });
    return this.createRequest({
      user: condominium?.sindico ?? null,
      company: condominium?.company ?? null,
      barrel: { id: barrel.id } as Barrel,
      sensor: sensor ? ({ id: sensor.id } as Sensor) : null,
      status: 'SCHEDULED',
      origin: 'COMPANY',
      levelAtRequest: sensor?.level ?? null,
      scheduledDate: scheduledDate ?? new Date(),
      userCpfSnapshot: null,
      companyCnpjSnapshot: condominium?.company?.cnpj ?? null,
      userAddressSnapshot: condominium?.address ?? null,
    });
  }

  private async createRequest(
    data: Partial<CollectionRequest>,
  ): Promise<CollectionRequest> {
    const saved = await this.collectionRepo.save(
      this.collectionRepo.create(data),
    );
    const full = await this.findById(saved.id);
    await this.events.emit<CollectionRequestCreatedEvent>(
      COLLECTION_REQUEST_CREATED,
      { request: full },
    );
    return full;
  }

  // ---------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------

  async findById(id: number): Promise<CollectionRequest> {
    const request = await this.collectionRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Solicitação ${id} não encontrada`);
    }
    return request;
  }

  /** Solicitação PENDING/SCHEDULED do barril, se houver (no máximo uma por barril). */
  async findOpenForBarrel(barrelId: number): Promise<CollectionRequest | null> {
    return this.collectionRepo.findOne({
      where: { barrel: { id: barrelId }, status: In(OPEN_REQUEST_STATUSES) },
      order: { requestedAt: 'DESC' },
    });
  }

  async findRecent(limit = 50): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      order: { requestedAt: 'DESC' },
      take: limit,
    });
  }

  async getActiveForUser(userId: number): Promise<CollectionRequest | null> {
    return this.collectionRepo.findActiveByUser(userId);
  }

  async getUserHistory(userId: number): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        user: { id: userId },
        status: In(CLOSED_STATUSES),
      },
      order: { requestedAt: 'DESC' },
    });
  }

  /** Solicitações em aberto da empresa: aguardando início (PENDING) e em andamento (SCHEDULED). */
  async getCompanyActiveRequests(
    companyId: number,
  ): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        company: { id: companyId },
        status: In(OPEN_REQUEST_STATUSES),
      },
      order: { requestedAt: 'ASC' },
    });
  }

  async getCompanyHistory(companyId: number): Promise<CollectionRequest[]> {
    return this.collectionRepo.find({
      where: {
        company: { id: companyId },
        status: In(CLOSED_STATUSES),
      },
      order: { requestedAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------
  // Ações da empresa coletora
  // ---------------------------------------------------------------

  /** "Iniciar etapa de coleta": PENDING → SCHEDULED. */
  async acceptRequest(
    requestId: number,
    companyId: number,
    scheduledDate?: Date,
  ): Promise<CollectionRequest> {
    const req = await this.findForCompany(requestId, companyId);
    if (req.status === 'SCHEDULED') return req;
    this.assertStatus(req, ['PENDING'], 'iniciar a coleta');
    return this.transition(req, 'SCHEDULED', {
      scheduledDate: scheduledDate ?? new Date(),
    });
  }

  /** Empresa conclui a coleta: PENDING/SCHEDULED → COMPLETED (barril volta a 0%). */
  async completeByCompany(
    requestId: number,
    companyId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForCompany(requestId, companyId);
    if (req.status === 'COMPLETED') return req;
    this.assertStatus(req, OPEN_REQUEST_STATUSES, 'concluir a coleta');
    const now = new Date();
    return this.transition(req, 'COMPLETED', {
      completedAt: now,
      scheduledDate: req.scheduledDate ?? now,
    });
  }

  async refuseRequest(
    requestId: number,
    companyId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForCompany(requestId, companyId);
    if (req.status === 'REFUSED') return req;
    this.assertStatus(req, OPEN_REQUEST_STATUSES, 'recusar');
    return this.transition(req, 'REFUSED', { scheduledDate: null });
  }

  // ---------------------------------------------------------------
  // Ações do usuário (fluxo antigo, mantidas para o frontend web).
  // O síndico só altera solicitações MANUAIS criadas por ele; as geradas pelo
  // sensor ou agendadas pela empresa ele apenas acompanha.
  // ---------------------------------------------------------------

  async cancelForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForUser(requestId, userId);
    this.assertSindicoCanChange(req, 'cancelar');
    this.assertStatus(req, OPEN_REQUEST_STATUSES, 'cancelar');
    return this.transition(req, 'CANCELLED', { scheduledDate: null });
  }

  async completeForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForUser(requestId, userId);
    this.assertSindicoCanChange(req, 'concluir');
    this.assertStatus(req, OPEN_REQUEST_STATUSES, 'concluir');
    return this.transition(req, 'COMPLETED', { completedAt: new Date() });
  }

  // ---------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------

  /** Solicitação que pertence a esta empresa (404 se não for). */
  async findForCompany(
    requestId: number,
    companyId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, company: { id: companyId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para esta empresa',
      );
    }
    return req;
  }

  /** Solicitação que pertence a este síndico (404 se não for). */
  async findForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.collectionRepo.findOne({
      where: { id: requestId, user: { id: userId } },
    });
    if (!req) {
      throw new NotFoundException(
        'Solicitação não encontrada para este usuário',
      );
    }
    return req;
  }

  /** Barril do sensorId/barrelId informado, desde que o condomínio seja cliente da empresa. */
  private async findBarrelForCompany(
    companyId: number,
    dto: ScheduleCollectionDto,
  ): Promise<Barrel> {
    let barrel: Barrel | null = null;
    if (dto.sensorId !== undefined) {
      const sensor = await this.sensors.findOne({
        where: { code: dto.sensorId.trim() },
      });
      barrel = sensor?.barrel ?? null;
    } else if (dto.barrelId !== undefined) {
      barrel = await this.barrels.findOne({ where: { id: dto.barrelId } });
    }
    if (barrel) {
      barrel = await this.barrels.findOne({
        where: { id: barrel.id },
        relations: { condominium: { company: true, sindico: true } },
      });
    }
    if (!barrel || barrel.condominium?.company?.id !== companyId) {
      throw new NotFoundException(
        'Barril não encontrado entre os condomínios clientes desta empresa',
      );
    }
    return barrel;
  }

  private assertSindicoCanChange(req: CollectionRequest, action: string): void {
    const origin = req.origin ?? 'MANUAL';
    if (origin !== 'MANUAL') {
      const by = origin === 'SENSOR' ? 'pelo sensor' : 'pela empresa coletora';
      throw new ForbiddenException(
        `Não é possível ${action}: a solicitação #${req.id} foi gerada ${by}. O síndico apenas acompanha; quem altera é a empresa coletora.`,
      );
    }
  }

  private assertStatus(
    req: CollectionRequest,
    allowed: CollectionRequestStatus[],
    action: string,
  ): void {
    if (!allowed.includes(req.status)) {
      throw new ConflictException(
        `Não é possível ${action}: a solicitação #${req.id} está ${req.status}.`,
      );
    }
  }

  /** Muda o status, salva e avisa os listeners (notificação do síndico, reset do barril). */
  private async transition(
    req: CollectionRequest,
    status: CollectionRequestStatus,
    changes: Partial<CollectionRequest> = {},
  ): Promise<CollectionRequest> {
    const previousStatus = req.status;
    Object.assign(req, changes, { status });
    await this.collectionRepo.save(req);
    const updated = await this.findById(req.id);
    if (previousStatus !== status) {
      await this.events.emit<CollectionRequestStatusChangedEvent>(
        COLLECTION_REQUEST_STATUS_CHANGED,
        { request: updated, previousStatus },
      );
    }
    return updated;
  }
}
