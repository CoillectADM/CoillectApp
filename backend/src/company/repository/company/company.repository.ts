import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from '../../entities/company/company.entity';
import { Repository } from 'typeorm';

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

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find();
  }
}
