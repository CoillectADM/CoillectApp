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

  async findByEmail(email: string): Promise<Company | null> {
    return this.companyRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<Company | null> {
    return this.companyRepo.findOne({
      where: { id },
      relations: ['addresses', 'contacts', 'representative'],
    });
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({
      relations: ['addresses', 'contacts', 'representative'],
    });
  }

  // ✅ Novo método adicionado:
  async save(company: Company): Promise<Company> {
    return this.companyRepo.save(company);
  }
}
