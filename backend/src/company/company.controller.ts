import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company/create-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address/create-company-address.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact/create-company-contact.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative/create-company-representative.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('register')
  async register(
    @Body('company') company: CreateCompanyDto,
    @Body('address') address: CreateCompanyAddressDto,
    @Body('contact') contact: CreateCompanyContactDto,
    @Body('representative') representative: CreateCompanyRepresentativeDto,
  ) {
    return this.companyService.createCompany(company, address, contact, representative);
  }

  @Get()
  async findAll() {
    return this.companyService.getAllCompanies();
  }

  @Get(':cnpj')
  async findByCnpj(@Param('cnpj') cnpj: string) {
    return this.companyService.findByCnpj(cnpj);
  }
}
