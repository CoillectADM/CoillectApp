import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user/user.entity';
import { Company } from '../company/entities/company/company.entity';
import { Condominium } from '../sensor/entities/condominium.entity';
import { Barrel } from '../sensor/entities/barrel.entity';
import { Sensor } from '../sensor/entities/sensor.entity';
import { SensorReading } from '../sensor/entities/sensor-reading.entity';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { Notification } from '../notification/notification.entity';
import { envFlag } from '../config/env';
import {
  DEMO_CAPACITY_LITERS,
  DEMO_COMPANY,
  DEMO_PASSWORD_DEFAULT,
  DEMO_SINDICO,
  DEMO_SITES,
  DEMO_THRESHOLD,
} from './demo-data';

/** Data de nascimento padrão: a tabela antiga de usuários exige o campo. */
export const DEFAULT_BIRTH_DATE = new Date('1980-01-01T12:00:00Z');

export function demoPassword(): string {
  return process.env.DEMO_PASSWORD || DEMO_PASSWORD_DEFAULT;
}

/**
 * Garante os dados mínimos da demonstração (síndico, empresa, condomínios,
 * barris e sensores) e oferece a limpeza para repetir o fluxo do zero.
 * Só cria o que estiver faltando: dados já existentes não são alterados.
 */
@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Condominium)
    private readonly condominiums: Repository<Condominium>,
    @InjectRepository(Barrel) private readonly barrels: Repository<Barrel>,
    @InjectRepository(Sensor) private readonly sensors: Repository<Sensor>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!envFlag(process.env.SEED_DEMO, true)) return;
    try {
      await this.ensureDemoData();
    } catch (error) {
      this.logger.error(`Falha ao criar dados de demonstração: ${error}`);
    }
  }

  async ensureDemoData(options: { resetLevels?: boolean } = {}): Promise<void> {
    const password = demoPassword();

    let sindico = await this.users.findOne({
      where: { email: DEMO_SINDICO.email },
    });
    if (!sindico) {
      sindico = await this.users.save(
        this.users.create({
          name: DEMO_SINDICO.name,
          email: DEMO_SINDICO.email,
          password: await bcrypt.hash(password, 10),
          status_email: true,
          data_nascimento: DEFAULT_BIRTH_DATE,
        }),
      );
      this.logger.log(`Síndico de demonstração criado: ${DEMO_SINDICO.email}`);
    }

    let company =
      (await this.companies.findOne({ where: { email: DEMO_COMPANY.email } })) ??
      (await this.companies.findOne({ where: { cnpj: DEMO_COMPANY.cnpj } }));
    if (!company) {
      company = await this.companies.save(
        this.companies.create({
          name: DEMO_COMPANY.name,
          email: DEMO_COMPANY.email,
          cnpj: DEMO_COMPANY.cnpj,
          password: await bcrypt.hash(password, 10),
          role: 'company',
          registrationStage: 'COMPLETED',
        }),
      );
      this.logger.log(`Empresa de demonstração criada: ${DEMO_COMPANY.email}`);
    }

    for (const site of DEMO_SITES) {
      let condominium = await this.condominiums.findOne({
        where: { name: site.condominium },
      });
      if (!condominium) {
        condominium = await this.condominiums.save(
          this.condominiums.create({
            name: site.condominium,
            address: site.address,
            neighborhood: site.neighborhood,
            sindico: site.linkSindico ? sindico : null,
            company,
          }),
        );
      }

      let barrel = await this.barrels.findOne({
        where: { code: site.barrelCode },
      });
      if (!barrel) {
        barrel = await this.barrels.save(
          this.barrels.create({
            code: site.barrelCode,
            condominium,
            capacityLiters: DEMO_CAPACITY_LITERS,
            alertThreshold: DEMO_THRESHOLD,
          }),
        );
      } else if (options.resetLevels) {
        await this.barrels.update(barrel.id, { lastCollectionAt: null });
      }

      const sensor = await this.sensors.findOne({
        where: { code: site.sensorId },
      });
      if (!sensor) {
        await this.sensors.save(
          this.sensors.create({
            code: site.sensorId,
            barrel,
            level: site.level,
            lastReadingAt: site.level > 0 ? new Date() : null,
          }),
        );
        this.logger.log(
          `Sensor de demonstração criado: ${site.sensorId} (barril ${site.barrelCode})`,
        );
      } else if (options.resetLevels) {
        await this.sensors.update(sensor.id, {
          level: site.level,
          lastReadingAt: site.level > 0 ? new Date() : null,
        });
      }
    }
  }

  /**
   * Limpa solicitações, notificações e leituras e devolve os barris ao estado
   * inicial. Use somente em ambiente de demonstração.
   */
  async resetDemoData(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.createQueryBuilder().delete().from(Notification).execute();
      await manager
        .createQueryBuilder()
        .delete()
        .from(CollectionRequest)
        .execute();
      await manager.createQueryBuilder().delete().from(SensorReading).execute();
      await manager
        .createQueryBuilder()
        .update(Sensor)
        .set({ level: 0, lastReadingAt: null })
        .execute();
      await manager
        .createQueryBuilder()
        .update(Barrel)
        .set({ lastCollectionAt: null })
        .execute();
    });
    await this.ensureDemoData({ resetLevels: true });
    this.logger.log('Dados de demonstração reiniciados.');
  }
}
