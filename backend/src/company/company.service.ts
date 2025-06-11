import { Injectable } from '@nestjs/common';
import { CompanyRepository } from './repository/company/company.repository';
import { CompanyAddressRepository } from './repository/company-address/company-address.repository';
import { CompanyContactRepository } from './repository/company-contact/company-contact.repository';
import { CompanyRepresentativeRepository } from './repository/company-representative/company-representative.repository';
import { CreateCompanyDto } from './dto/create-company/create-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address/create-company-address.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact/create-company-contact.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative/create-company-representative.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly addressRepo: CompanyAddressRepository,
    private readonly contactRepo: CompanyContactRepository,
    private readonly repRepo: CompanyRepresentativeRepository,
  ) {}

  async createCompany(
    companyData: CreateCompanyDto,
    addressData: CreateCompanyAddressDto,
    contactData: CreateCompanyContactDto,
    representativeData: CreateCompanyRepresentativeDto,
  ) {
    const company = await this.companyRepo.createCompany(companyData);
    const address = await this.addressRepo.createAddress({ ...addressData, company });
    const contact = await this.contactRepo.createContact({ ...contactData, company });
    const representative = await this.repRepo.createRepresentative({ ...representativeData, company });

    return {
      company,
      address,
      contact,
      representative,
    };
  }

  async getAllCompanies() {
    return this.companyRepo.findAll();
  }

  async findByCnpj(cnpj: string) {
    return this.companyRepo.findByCnpj(cnpj);
  }
}
