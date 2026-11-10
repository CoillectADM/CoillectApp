import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Condominium } from '../sensor/entities/condominium.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { SensorReading } from '../sensor/entities/sensor-reading.entity';
import {
  CollectionRequest,
  OPEN_REQUEST_STATUSES,
} from '../collection-request/collection-request.entity';
import { User } from '../user/entities/user/user.entity';
import { Company } from '../company/entities/company/company.entity';
import { SensorService } from '../sensor/sensor.service';
import { SensorView } from '../sensor/sensor.view';
import { CollectionRequestService } from '../collection-request/collection-request.service';
import {
  CollectionRequestView,
  toRequestView,
} from '../collection-request/collection-request.view';
import { DemoSeedService } from '../demo/demo-seed.service';
import { CreateCondominiumDto, UpdateCondominiumDto } from './dto/condominium.dto';
import { CreateSensorDto, UpdateSensorDto } from './dto/sensor-admin.dto';

export interface AdminOverview {
  generatedAt: Date;
  counts: {
    condominiums: number;
    sensors: number;
    sensorsAtThreshold: number;
    openRequests: number;
    completedRequests: number;
  };
  sensors: SensorView[];
  /** Últimas 50 solicitações, mais recentes primeiro. */
  requests: CollectionRequestView[];
}

export interface CondominiumView {
  id: number;
  name: string;
  address: string | null;
  sindico: { id: number; name: string; email: string } | null;
  company: { id: number; name: string; email: string } | null;
  sensors: { id: number; sensorId: string; level: number; threshold: number }[];
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Condominium)
    private readonly condominiums: Repository<Condominium>,
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readonly readings: Repository<SensorReading>,
    @InjectRepository(CollectionRequest)
    private readonly requestRepo: Repository<CollectionRequest>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly sensorService: SensorService,
    private readonly requestService: CollectionRequestService,
    private readonly demo: DemoSeedService,
  ) {}

  async overview(): Promise<AdminOverview> {
    const sensors = await this.sensorService.findAllViews();
    const recent = await this.requestService.findRecent(50);
    const [condominiums, openRequests, completedRequests] = await Promise.all([
      this.condominiums.count(),
      this.requestRepo.count({ where: { status: In(OPEN_REQUEST_STATUSES) } }),
      this.requestRepo.count({ where: { status: 'COMPLETED' } }),
    ]);
    return {
      generatedAt: new Date(),
      counts: {
        condominiums,
        sensors: sensors.length,
        sensorsAtThreshold: sensors.filter((s) => s.needsCollection).length,
        openRequests,
        completedRequests,
      },
      sensors,
      requests: recent.map(toRequestView),
    };
  }

  // ---------------------------------------------------------------
  // Condomínios
  // ---------------------------------------------------------------

  async listCondominiums(): Promise<CondominiumView[]> {
    const list = await this.condominiums.find({
      relations: { sindico: true, company: true, sensors: true },
      order: { name: 'ASC' },
    });
    return list.map(toCondominiumView);
  }

  async createCondominium(dto: CreateCondominiumDto): Promise<CondominiumView> {
    const condominium = this.condominiums.create({
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      sindico: await this.findUserOrNull(dto.sindicoId),
      company: await this.findCompanyOrNull(dto.companyId),
    });
    const saved = await this.condominiums.save(condominium);
    return this.getCondominium(saved.id);
  }

  async updateCondominium(
    id: number,
    dto: UpdateCondominiumDto,
  ): Promise<CondominiumView> {
    const condominium = await this.condominiums.findOne({
      where: { id },
      relations: { sindico: true, company: true },
    });
    if (!condominium) {
      throw new NotFoundException(`Condomínio ${id} não encontrado`);
    }
    if (dto.name !== undefined) condominium.name = dto.name.trim();
    if (dto.address !== undefined) condominium.address = dto.address?.trim() || null;
    if (dto.sindicoId !== undefined) {
      condominium.sindico = await this.findUserOrNull(dto.sindicoId);
    }
    if (dto.companyId !== undefined) {
      condominium.company = await this.findCompanyOrNull(dto.companyId);
    }
    await this.condominiums.save(condominium);
    return this.getCondominium(id);
  }

  private async getCondominium(id: number): Promise<CondominiumView> {
    const condominium = await this.condominiums.findOne({
      where: { id },
      relations: { sindico: true, company: true, sensors: true },
    });
    if (!condominium) {
      throw new NotFoundException(`Condomínio ${id} não encontrado`);
    }
    return toCondominiumView(condominium);
  }

  // ---------------------------------------------------------------
  // Sensores
  // ---------------------------------------------------------------

  listSensors(): Promise<SensorView[]> {
    return this.sensorService.findAllViews();
  }

  async createSensor(dto: CreateSensorDto): Promise<SensorView> {
    const code = dto.sensorId.trim();
    if (await this.sensors.findOne({ where: { code } })) {
      throw new ConflictException(`Sensor "${code}" já cadastrado`);
    }
    await this.sensors.save(
      this.sensors.create({
        code,
        condominium: await this.findCondominiumOrNull(dto.condominiumId),
        threshold: dto.threshold ?? 80,
        capacityLiters: dto.capacityLiters ?? null,
        level: 0,
      }),
    );
    return this.sensorService.findViewByCode(code);
  }

  async updateSensor(code: string, dto: UpdateSensorDto): Promise<SensorView> {
    const sensor = await this.sensors.findOne({ where: { code } });
    if (!sensor) {
      throw new NotFoundException(`Sensor "${code}" não cadastrado`);
    }
    if (dto.condominiumId !== undefined) {
      sensor.condominium = await this.findCondominiumOrNull(dto.condominiumId);
    }
    if (dto.threshold !== undefined) sensor.threshold = dto.threshold;
    if (dto.capacityLiters !== undefined) {
      sensor.capacityLiters = dto.capacityLiters;
    }
    await this.sensors.save(sensor);
    return this.sensorService.findViewByCode(code);
  }

  async listReadings(sensorId?: string, limit = 50) {
    const list = await this.readings.find({
      where: sensorId ? { sensor: { code: sensorId } } : {},
      relations: { sensor: true },
      order: { receivedAt: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
    return list.map((reading) => ({
      id: reading.id,
      sensorId: reading.sensor?.code ?? null,
      level: reading.level,
      receivedAt: reading.receivedAt,
    }));
  }

  // ---------------------------------------------------------------
  // Listas para os formulários do desktop
  // ---------------------------------------------------------------

  async listUsers() {
    const list = await this.users.find({ order: { name: 'ASC' } });
    return list.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  async listCompanies() {
    const list = await this.companies.find({ order: { name: 'ASC' } });
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      cnpj: c.cnpj,
      iconeUrl: c.iconeUrl ?? null,
    }));
  }

  // ---------------------------------------------------------------
  // Demonstração
  // ---------------------------------------------------------------

  async resetDemo(): Promise<AdminOverview> {
    await this.demo.resetDemoData();
    return this.overview();
  }

  private async findUserOrNull(id?: number | null): Promise<User | null> {
    if (id === undefined || id === null) return null;
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return user;
  }

  private async findCompanyOrNull(id?: number | null): Promise<Company | null> {
    if (id === undefined || id === null) return null;
    const company = await this.companies.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Empresa ${id} não encontrada`);
    return company;
  }

  private async findCondominiumOrNull(
    id?: number | null,
  ): Promise<Condominium | null> {
    if (id === undefined || id === null) return null;
    const condominium = await this.condominiums.findOne({ where: { id } });
    if (!condominium) {
      throw new NotFoundException(`Condomínio ${id} não encontrado`);
    }
    return condominium;
  }
}

function toCondominiumView(condominium: Condominium): CondominiumView {
  return {
    id: condominium.id,
    name: condominium.name,
    address: condominium.address ?? null,
    sindico: condominium.sindico
      ? {
          id: condominium.sindico.id,
          name: condominium.sindico.name,
          email: condominium.sindico.email,
        }
      : null,
    company: condominium.company
      ? {
          id: condominium.company.id,
          name: condominium.company.name,
          email: condominium.company.email,
        }
      : null,
    sensors: (condominium.sensors ?? []).map((sensor) => ({
      id: sensor.id,
      sensorId: sensor.code,
      level: sensor.level,
      threshold: sensor.threshold,
    })),
    createdAt: condominium.createdAt,
  };
}
