// src/company/repository/company/company.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../entities/company/company.entity';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async createCompany(data: Partial<Company>): Promise<Company> {
    const company = this.companyRepo.create(data);
    return this.companyRepo.save(company);
  }

  async findByCnpj(cnpj: string): Promise<Company | null> {
    return this.companyRepo.findOne({ where: { cnpj } });
  }

  async findById(id: number): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { id },
      relations: ['addresses', 'contacts', 'representative'],
    });
  }

  // Para listagem na dashboard: só id, name, iconeUrl
  async findAll(): Promise<Company[]> {
    return this.companyRepo.createQueryBuilder('company')
      .select(['company.id', 'company.name', 'company.iconeUrl'])
      .getMany();
  }

  async save(company: Company): Promise<Company> {
    return this.companyRepo.save(company);
  }

  async findOne(params: Partial<Company>): Promise<Company | null> {
    return this.companyRepo.findOne({ where: params });
  }

  async findByEmail(email: string): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { email },
    });
  }
}
