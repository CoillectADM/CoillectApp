import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyRepresentative } from '../../entities/company_representative/company-representative.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyRepresentativeRepository {
  constructor(
    @InjectRepository(CompanyRepresentative)
    private readonly representativeRepo: Repository<CompanyRepresentative>,
  ) {}

  async createRepresentative(data: Partial<CompanyRepresentative>): Promise<CompanyRepresentative> {
    const representative = this.representativeRepo.create(data);
    return this.representativeRepo.save(representative);
  }

  async findAll(): Promise<CompanyRepresentative[]> {
    return this.representativeRepo.find();
  }
}
