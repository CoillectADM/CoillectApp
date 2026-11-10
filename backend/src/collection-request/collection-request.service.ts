import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
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

    const request = this.collectionRepo.create({
      user,
      company,
      status: 'PENDING',
      origin: 'MANUAL',
      scheduledDate: null,
      userCpfSnapshot: null,
      companyCnpjSnapshot: company.cnpj,
      userAddressSnapshot: null,
    });

    const saved = await this.collectionRepo.save(request);
    const full = await this.findById(saved.id);
    await this.events.emit<CollectionRequestCreatedEvent>(
      COLLECTION_REQUEST_CREATED,
      { request: full },
    );
    return full;
  }

  /**
   * Fluxo do MVP: chamado pelo listener quando a leitura do sensor atinge o limite.
   * Cria a solicitação PRINCIPAL para a empresa do condomínio; o síndico recebe
   * uma cópia/notificação vinculada a esta mesma solicitação (sem duplicar a coleta).
   * O sensor deve vir carregado com condominium.company e condominium.sindico.
   */
  async createFromSensor(
    sensor: Sensor,
    level: number,
  ): Promise<CollectionRequest> {
    const condominium = sensor.condominium;
    const request = this.collectionRepo.create({
      user: condominium?.sindico ?? null,
      company: condominium?.company ?? null,
      sensor: { id: sensor.id } as Sensor,
      status: 'PENDING',
      origin: 'SENSOR',
      levelAtRequest: level,
      scheduledDate: null,
      userCpfSnapshot: null,
      companyCnpjSnapshot: condominium?.company?.cnpj ?? null,
      userAddressSnapshot: condominium?.address ?? null,
    });

    const saved = await this.collectionRepo.save(request);
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

  /** Solicitação PENDING/SCHEDULED do sensor, se houver. */
  async findOpenForSensor(sensorId: number): Promise<CollectionRequest | null> {
    return this.collectionRepo.findOne({
      where: { sensor: { id: sensorId }, status: In(OPEN_REQUEST_STATUSES) },
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
  // Ações do usuário (fluxo antigo, mantidas por compatibilidade)
  // ---------------------------------------------------------------

  async cancelForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForUser(requestId, userId);
    return this.transition(req, 'CANCELLED', { scheduledDate: null });
  }

  async completeForUser(
    requestId: number,
    userId: number,
  ): Promise<CollectionRequest> {
    const req = await this.findForUser(requestId, userId);
    return this.transition(req, 'COMPLETED', { completedAt: new Date() });
  }

  // ---------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------

  private async findForCompany(
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

  private async findForUser(
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
