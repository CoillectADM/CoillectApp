import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyAddress } from '../../entities/company_address/company-address.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyAddressRepository {
  constructor(
    @InjectRepository(CompanyAddress)
    private readonly addressRepo: Repository<CompanyAddress>,
  ) {}

  async createAddress(data: Partial<CompanyAddress>): Promise<CompanyAddress> {
    const address = this.addressRepo.create(data);
    return this.addressRepo.save(address);
  }

  async findAll(): Promise<CompanyAddress[]> {
    return this.addressRepo.find();
  }
}
