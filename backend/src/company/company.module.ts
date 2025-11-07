import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

import { Company } from './entities/company/company.entity';
import { CompanyAddress } from './entities/company_address/company-address.entity';
import { CompanyContact } from './entities/company_contact/company-contact.entity';
import { CompanyRepresentative } from './entities/company_representative/company-representative.entity';

import { CompanyRepository } from './repository/company/company.repository';
import { CompanyAddressRepository } from './repository/company-address/company-address.repository';
import { CompanyContactRepository } from './repository/company-contact/company-contact.repository';
import { CompanyRepresentativeRepository } from './repository/company-representative/company-representative.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyAddress,
      CompanyContact,
      CompanyRepresentative,
    ]),
  ],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyRepository,
    CompanyAddressRepository,
    CompanyContactRepository,
    CompanyRepresentativeRepository,
  ],
})
export class CompanyModule {}
