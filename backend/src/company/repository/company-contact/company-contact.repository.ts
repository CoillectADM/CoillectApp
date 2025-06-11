import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyContact } from '../../entities/company_contact/company-contact.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyContactRepository {
  constructor(
    @InjectRepository(CompanyContact)
    private readonly contactRepo: Repository<CompanyContact>,
  ) {}

  async createContact(data: Partial<CompanyContact>): Promise<CompanyContact> {
    const contact = this.contactRepo.create(data);
    return this.contactRepo.save(contact);
  }

  async findAll(): Promise<CompanyContact[]> {
    return this.contactRepo.find();
  }
}
