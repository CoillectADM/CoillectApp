import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { APIResponse } from 'src/utils/response/response';
import { CreateCompanyDto } from './dto/create-company/create-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address/create-company-address.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact/create-company-contact.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative/create-company-representative.dto';

import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // -----------------------------
  // CHECAGEM DE DISPONIBILIDADE
  // -----------------------------
  @Get('check')
  @ApiOperation({ summary: 'Checa disponibilidade de email e/ou CNPJ' })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'cnpj', required: false })
  @ApiResponse({ status: 200, description: 'Campos disponíveis ou conflitando' })
  async checkAvailability(
    @Query('email') email?: string,
    @Query('cnpj') cnpj?: string,
  ): Promise<APIResponse> {
    const result = await this.companyService.checkAvailability(email, cnpj);
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Checagem concluída com sucesso')
      .build();
  }

  // -----------------------------
  // ETAPA 1
  // -----------------------------
  @Post('register/step1')
  @ApiOperation({ summary: 'Etapa 1 - Dados básicos da empresa' })
  @ApiResponse({ status: 201, description: 'Empresa criada parcialmente' })
  @ApiResponse({ status: 409, description: 'E-mail ou CNPJ já existentes' })
  async registerStep1(@Body() dto: CreateCompanyDto): Promise<APIResponse> {
    const result = await this.companyService.registerStep1(dto);
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(201)
      .setMessage('Empresa criada (Etapa 1)')
      .build();
  }

  // -----------------------------
  // ETAPA 2
  // -----------------------------
  @Post('register/address/:companyId')
  @ApiOperation({ summary: 'Etapa 2 - Cadastro de endereço' })
  @ApiResponse({ status: 201, description: 'Endereço cadastrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async registerStep2(
    @Param('companyId') companyId: number,
    @Body() address: CreateCompanyAddressDto,
  ): Promise<APIResponse> {
    const result = await this.companyService.registerStep2(companyId, address);
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(201)
      .setMessage('Etapa 2 concluída')
      .build();
  }

  // -----------------------------
  // ETAPA 3 - Contato
  // -----------------------------
  @Post('register/contact/:companyId')
  @ApiOperation({ summary: 'Etapa 3 - Cadastro de contato' })
  @ApiResponse({ status: 201, description: 'Contato cadastrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async registerStep3(
    @Param('companyId') companyId: number,
    @Body() contact: CreateCompanyContactDto,
  ): Promise<APIResponse> {
    const result = await this.companyService.registerStep3(companyId, contact);
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(201)
      .setMessage('Etapa 3 concluída (contato cadastrado)')
      .build();
  }
  
  // -----------------------------
  // ETAPA 4 - Representante
  // -----------------------------
  @Post('register/representative/:companyId')
  @ApiOperation({ summary: 'Etapa 4 - Cadastro de representante' })
  @ApiResponse({ status: 201, description: 'Representante cadastrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async registerStep4(
    @Param('companyId') companyId: number,
    @Body() representative: CreateCompanyRepresentativeDto,
  ): Promise<APIResponse> {
    const result = await this.companyService.registerStep4(companyId, representative);
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(201)
      .setMessage('Etapa 4 concluída (cadastro finalizado)')
      .build();
  }


  // -----------------------------
  // CONSULTAS
  // -----------------------------
  @Get()
  @ApiOperation({ summary: 'Lista todas as empresas' })
  async findAll(): Promise<APIResponse> {
    const companies = await this.companyService.getAllCompanies();
    return new APIResponse()
      .setData(companies)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Empresas listadas com sucesso')
      .build();
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Busca empresa por CNPJ' })
  async findByCnpj(@Param('cnpj') cnpj: string): Promise<APIResponse> {
    const company = await this.companyService.findByCnpj(cnpj);
    return new APIResponse()
      .setData(company)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Empresa encontrada com sucesso')
      .build();
  }
}
