import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Condominium } from '../sensor/entities/condominium.entity';
import { Barrel, DEFAULT_ALERT_THRESHOLD } from '../sensor/entities/barrel.entity';
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
import {
  DEFAULT_BIRTH_DATE,
  demoPassword,
  DemoSeedService,
} from '../demo/demo-seed.service';
import { CreateCondominiumDto, UpdateCondominiumDto } from './dto/condominium.dto';
import {
  CreateBarrelDto,
  CreateSensorDto,
  UpdateBarrelDto,
  UpdateSensorDto,
} from './dto/sensor-admin.dto';
import { AdminCreateCompanyDto, CreateSindicoDto } from './dto/people.dto';

export interface AdminOverview {
  generatedAt: Date;
  counts: {
    condominiums: number;
    barrels: number;
    sensors: number;
    sensorsOnline: number;
    sensorsAtThreshold: number;
    openRequests: number;
    completedRequests: number;
  };
  sensors: SensorView[];
  /** Últimas 50 solicitações, mais recentes primeiro. */
  requests: CollectionRequestView[];
}

export interface PersonView {
  id: number;
  name: string;
  email: string;
}

export interface CompanyView extends PersonView {
  cnpj: string;
  iconeUrl: string | null;
}

export interface BarrelView {
  id: number;
  code: string;
  capacityLiters: number | null;
  alertThreshold: number;
  lastCollectionAt: Date | null;
  condominium: { id: number; name: string } | null;
  sensors: { id: number; sensorId: string; level: number; lastReadingAt: Date | null }[];
}

export interface CondominiumView {
  id: number;
  name: string;
  address: string | null;
  neighborhood: string | null;
  sindico: PersonView | null;
  company: PersonView | null;
  barrels: { id: number; code: string; alertThreshold: number }[];
  /** Sensores instalados nos barris do condomínio (formato antigo, mantido). */
  sensors: { id: number; sensorId: string; level: number; threshold: number }[];
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Condominium)
    private readonly condominiums: Repository<Condominium>,
    @InjectRepository(Barrel) private readonly barrels: Repository<Barrel>,
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
    const [condominiums, barrels, openRequests, completedRequests] =
      await Promise.all([
        this.condominiums.count(),
        this.barrels.count(),
        this.requestRepo.count({ where: { status: In(OPEN_REQUEST_STATUSES) } }),
        this.requestRepo.count({ where: { status: 'COMPLETED' } }),
      ]);
    return {
      generatedAt: new Date(),
      counts: {
        condominiums,
        barrels,
        sensors: sensors.length,
        sensorsOnline: sensors.filter((s) => s.online).length,
        sensorsAtThreshold: sensors.filter((s) => s.needsCollection).length,
        openRequests,
        completedRequests,
      },
      sensors,
      requests: recent.map(toRequestView),
    };
  }

  // ---------------------------------------------------------------
  // Síndicos e empresas coletoras
  // ---------------------------------------------------------------

  async listSindicos(): Promise<PersonView[]> {
    const list = await this.users.find({ order: { name: 'ASC' } });
    return list.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  async createSindico(dto: CreateSindicoDto): Promise<PersonView> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException(`Já existe um usuário com o e-mail ${email}`);
    }
    const user = await this.users.save(
      this.users.create({
        name: dto.name.trim(),
        email,
        password: await bcrypt.hash(dto.password || demoPassword(), 10),
        status_email: true,
        data_nascimento: DEFAULT_BIRTH_DATE,
      }),
    );
    return { id: user.id, name: user.name, email: user.email };
  }

  async listCompanies(): Promise<CompanyView[]> {
    const list = await this.companies.find({ order: { name: 'ASC' } });
    return list.map(toCompanyView);
  }

  async createCompany(dto: AdminCreateCompanyDto): Promise<CompanyView> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.companies.findOne({
      where: [{ email }, { cnpj: dto.cnpj }],
    });
    if (existing) {
      throw new ConflictException(
        existing.cnpj === dto.cnpj
          ? `Já existe uma empresa com o CNPJ ${dto.cnpj}`
          : `Já existe uma empresa com o e-mail ${email}`,
      );
    }
    const company = await this.companies.save(
      this.companies.create({
        name: dto.name.trim(),
        email,
        cnpj: dto.cnpj,
        password: await bcrypt.hash(dto.password || demoPassword(), 10),
        role: 'company',
        registrationStage: 'COMPLETED',
      }),
    );
    return toCompanyView(company);
  }

  // ---------------------------------------------------------------
  // Condomínios
  // ---------------------------------------------------------------

  async listCondominiums(): Promise<CondominiumView[]> {
    const list = await this.condominiums.find({
      relations: { sindico: true, company: true, barrels: { sensors: true } },
      order: { name: 'ASC' },
    });
    return list.map(toCondominiumView);
  }

  async createCondominium(dto: CreateCondominiumDto): Promise<CondominiumView> {
    const condominium = this.condominiums.create({
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      neighborhood: dto.neighborhood?.trim() || null,
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
    if (dto.neighborhood !== undefined) {
      condominium.neighborhood = dto.neighborhood?.trim() || null;
    }
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
      relations: { sindico: true, company: true, barrels: { sensors: true } },
    });
    if (!condominium) {
      throw new NotFoundException(`Condomínio ${id} não encontrado`);
    }
    return toCondominiumView(condominium);
  }

  // ---------------------------------------------------------------
  // Barris
  // ---------------------------------------------------------------

  async listBarrels(): Promise<BarrelView[]> {
    const list = await this.barrels.find({
      relations: { sensors: true },
      order: { code: 'ASC' },
    });
    return list.map(toBarrelView);
  }

  async createBarrel(dto: CreateBarrelDto): Promise<BarrelView> {
    const code = dto.code.trim();
    await this.assertBarrelCodeFree(code);
    const saved = await this.barrels.save(
      this.barrels.create({
        code,
        condominium: await this.findCondominiumOrNull(dto.condominiumId),
        capacityLiters: dto.capacityLiters ?? null,
        alertThreshold: dto.alertThreshold ?? DEFAULT_ALERT_THRESHOLD,
      }),
    );
    return this.getBarrel(saved.id);
  }

  async updateBarrel(id: number, dto: UpdateBarrelDto): Promise<BarrelView> {
    const barrel = await this.findBarrel(id);
    if (dto.condominiumId !== undefined) {
      barrel.condominium = await this.findCondominiumOrNull(dto.condominiumId);
    }
    if (dto.capacityLiters !== undefined) barrel.capacityLiters = dto.capacityLiters;
    if (dto.alertThreshold !== undefined) barrel.alertThreshold = dto.alertThreshold;
    await this.barrels.save(barrel);
    return this.getBarrel(id);
  }

  private async getBarrel(id: number): Promise<BarrelView> {
    const barrel = await this.barrels.findOne({
      where: { id },
      relations: { sensors: true },
    });
    if (!barrel) throw new NotFoundException(`Barril ${id} não encontrado`);
    return toBarrelView(barrel);
  }

  // ---------------------------------------------------------------
  // Sensores (o ESP32 físico ou o sensor virtual)
  // ---------------------------------------------------------------

  listSensors(): Promise<SensorView[]> {
    return this.sensorService.findAllViews();
  }

  async createSensor(dto: CreateSensorDto): Promise<SensorView> {
    const code = dto.sensorId.trim();
    if (await this.sensors.findOne({ where: { code } })) {
      throw new ConflictException(`Sensor "${code}" já cadastrado`);
    }

    let barrel: Barrel | null = null;
    if (dto.barrelId !== undefined && dto.barrelId !== null) {
      barrel = await this.findBarrel(dto.barrelId);
      await this.assertBarrelFree(barrel);
      await this.applyBarrelSettings(barrel, dto);
    } else if (dto.condominiumId !== undefined && dto.condominiumId !== null) {
      // Atalho: cria o barril do sensor no condomínio informado.
      const barrelCode = `BRL-${code}`;
      await this.assertBarrelCodeFree(barrelCode);
      barrel = await this.barrels.save(
        this.barrels.create({
          code: barrelCode,
          condominium: await this.findCondominiumOrNull(dto.condominiumId),
          capacityLiters: dto.capacityLiters ?? null,
          alertThreshold: dto.threshold ?? DEFAULT_ALERT_THRESHOLD,
        }),
      );
    }

    await this.sensors.save(this.sensors.create({ code, barrel, level: 0 }));
    return this.sensorService.findViewByCode(code);
  }

  async updateSensor(code: string, dto: UpdateSensorDto): Promise<SensorView> {
    const sensor = await this.sensors.findOne({ where: { code } });
    if (!sensor) {
      throw new NotFoundException(`Sensor "${code}" não cadastrado`);
    }
    if (dto.barrelId !== undefined) {
      if (dto.barrelId === null) {
        sensor.barrel = null;
      } else {
        const barrel = await this.findBarrel(dto.barrelId);
        await this.assertBarrelFree(barrel, sensor.id);
        sensor.barrel = barrel;
      }
      await this.sensors.save(sensor);
    }
    if (dto.threshold !== undefined || dto.capacityLiters !== undefined) {
      if (!sensor.barrel) {
        throw new ConflictException(
          `Sensor "${code}" não está instalado em um barril: informe barrelId antes de definir limite ou capacidade.`,
        );
      }
      await this.applyBarrelSettings(await this.findBarrel(sensor.barrel.id), dto);
    }
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
      dataHora: reading.deviceTimestamp ?? null,
      receivedAt: reading.receivedAt,
    }));
  }

  // ---------------------------------------------------------------
  // Demonstração
  // ---------------------------------------------------------------

  async resetDemo(): Promise<AdminOverview> {
    await this.demo.resetDemoData();
    return this.overview();
  }

  // ---------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------

  private async applyBarrelSettings(
    barrel: Barrel,
    dto: { threshold?: number; capacityLiters?: number | null },
  ): Promise<void> {
    if (dto.threshold === undefined && dto.capacityLiters === undefined) return;
    if (dto.threshold !== undefined) barrel.alertThreshold = dto.threshold;
    if (dto.capacityLiters !== undefined) barrel.capacityLiters = dto.capacityLiters;
    await this.barrels.save(barrel);
  }

  /** Um sensor por barril: evita duas leituras diferentes para o mesmo reservatório. */
  private async assertBarrelFree(barrel: Barrel, sensorId?: number): Promise<void> {
    const other = await this.sensors.findOne({
      where: {
        barrel: { id: barrel.id },
        ...(sensorId ? { id: Not(sensorId) } : {}),
      },
    });
    if (other) {
      throw new ConflictException(
        `O barril ${barrel.code} já tem o sensor ${other.code} instalado`,
      );
    }
  }

  private async assertBarrelCodeFree(code: string): Promise<void> {
    if (await this.barrels.findOne({ where: { code } })) {
      throw new ConflictException(`Barril "${code}" já cadastrado`);
    }
  }

  private async findBarrel(id: number): Promise<Barrel> {
    const barrel = await this.barrels.findOne({ where: { id } });
    if (!barrel) throw new NotFoundException(`Barril ${id} não encontrado`);
    return barrel;
  }

  private async findUserOrNull(id?: number | null): Promise<User | null> {
    if (id === undefined || id === null) return null;
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Síndico ${id} não encontrado`);
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

function toCompanyView(company: Company): CompanyView {
  return {
    id: company.id,
    name: company.name,
    email: company.email,
    cnpj: company.cnpj,
    iconeUrl: company.iconeUrl ?? null,
  };
}

function toBarrelView(barrel: Barrel): BarrelView {
  return {
    id: barrel.id,
    code: barrel.code,
    capacityLiters: barrel.capacityLiters ?? null,
    alertThreshold: barrel.alertThreshold,
    lastCollectionAt: barrel.lastCollectionAt ?? null,
    condominium: barrel.condominium
      ? { id: barrel.condominium.id, name: barrel.condominium.name }
      : null,
    sensors: (barrel.sensors ?? []).map((sensor) => ({
      id: sensor.id,
      sensorId: sensor.code,
      level: sensor.level,
      lastReadingAt: sensor.lastReadingAt ?? null,
    })),
  };
}

function toCondominiumView(condominium: Condominium): CondominiumView {
  const barrels = condominium.barrels ?? [];
  return {
    id: condominium.id,
    name: condominium.name,
    address: condominium.address ?? null,
    neighborhood: condominium.neighborhood ?? null,
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
    barrels: barrels.map((barrel) => ({
      id: barrel.id,
      code: barrel.code,
      alertThreshold: barrel.alertThreshold,
    })),
    sensors: barrels.flatMap((barrel) =>
      (barrel.sensors ?? []).map((sensor) => ({
        id: sensor.id,
        sensorId: sensor.code,
        level: sensor.level,
        threshold: barrel.alertThreshold,
      })),
    ),
    createdAt: condominium.createdAt,
  };
}
