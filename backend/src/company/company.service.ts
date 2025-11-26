import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CompanyRepository } from './repository/company/company.repository';
import { CompanyAddressRepository } from './repository/company-address/company-address.repository';
import { CompanyContactRepository } from './repository/company-contact/company-contact.repository';
import { CompanyRepresentativeRepository } from './repository/company-representative/company-representative.repository';
import { CreateCompanyDto } from './dto/create-company/create-company.dto';
import { CreateCompanyAddressDto } from './dto/create-company-address/create-company-address.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact/create-company-contact.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative/create-company-representative.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly addressRepo: CompanyAddressRepository,
    private readonly contactRepo: CompanyContactRepository,
    private readonly repRepo: CompanyRepresentativeRepository,
  ) {}

  // NOVO MÉTODO: Cadastro Completo
  async registerFullCompany(form: {
    company: CreateCompanyDto,
    address: CreateCompanyAddressDto,
    contact: CreateCompanyContactDto,
    representative: CreateCompanyRepresentativeDto
  }) {
    // Checagem de unicidade antes de iniciar
    const { available, conflicts } = await this.checkAvailability(
      form.company.email,
      form.company.cnpj,
    );

    if (!available) {
      throw new ConflictException(
        `Já existe empresa com: ${conflicts.join(' e ')}`
      );
    }

    // Criptografa senha
    const hashedPassword = await bcrypt.hash(form.company.password, 10);

    // Criação da empresa
    const company = await this.companyRepo.createCompany({
      ...form.company,
      password: hashedPassword,
      role: 'company',
      registrationStage: 'STEP_1',
    });

    // Endereço
    await this.addressRepo.createAddress({
      ...form.address,
      company,
    });

    // Contato
    await this.contactRepo.createContact({
      ...form.contact,
      company,
    });

    // Representante
    await this.repRepo.createRepresentative({
      ...form.representative,
      company,
    });

    // Atualiza para concluído
    company.registrationStage = 'COMPLETED';
    await this.companyRepo.save(company);

    return {
      id: company.id,
      name: company.name,
      email: company.email,
      cnpj: company.cnpj,
      stage: 'COMPLETED',
      message: 'Cadastro da empresa realizado com sucesso!',
    };
  }

  // -----------------------------
  // CHECAGEM DE UNICIDADE
  // -----------------------------
  async checkAvailability(email?: string, cnpj?: string) {
    const conflicts: string[] = [];

    if (email) {
      const existingEmail = await this.companyRepo.findByEmail(email);
      if (existingEmail) conflicts.push('email');
    }

    if (cnpj) {
      const existingCnpj = await this.companyRepo.findByCnpj(cnpj);
      if (existingCnpj) conflicts.push('cnpj');
    }

    return { available: conflicts.length === 0, conflicts };
  }

  // -----------------------------
  // ETAPA 1: DADOS BÁSICOS
  // -----------------------------
  async registerStep1(dto: CreateCompanyDto) {
    const { available, conflicts } = await this.checkAvailability(
      dto.email,
      dto.cnpj,
    );

    if (!available) {
      throw new ConflictException(
        `Já existe empresa com: ${conflicts.join(' e ')}`
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const company = await this.companyRepo.createCompany({
      ...dto,
      password: hashedPassword,
      role: 'company',
    });

    return {
      id: company.id,
      name: company.name,
      email: company.email,
      cnpj: company.cnpj,
      stage: 'STEP_1',
    };
  }

  // -----------------------------
  // ETAPA 2: ENDEREÇO
  // -----------------------------
  async registerStep2(companyId: number, addressData: CreateCompanyAddressDto) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada');

    await this.addressRepo.createAddress({ ...addressData, company });

    return {
      id: company.id,
      stage: 'STEP_2',
      message: 'Endereço cadastrado com sucesso',
    };
  }

  // -----------------------------
  // ETAPA 3: CONTATO
  // -----------------------------
  async registerStep3(companyId: number, contactData: CreateCompanyContactDto) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada');

    await this.contactRepo.createContact({ ...contactData, company });

    // Atualiza o progresso
    company.registrationStage = 'STEP_3';
    await this.companyRepo.save(company);

    return {
      id: company.id,
      stage: 'STEP_3',
      message: 'Contato cadastrado com sucesso',
    };
  }

  // -----------------------------
  // ETAPA 4: REPRESENTANTE
  // -----------------------------
  async registerStep4(companyId: number, repData: CreateCompanyRepresentativeDto) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada');

    await this.repRepo.createRepresentative({ ...repData, company });

    // Finaliza o progresso
    company.registrationStage = 'COMPLETED';
    await this.companyRepo.save(company);

    return {
      id: company.id,
      stage: 'COMPLETED',
      message: 'Cadastro finalizado com sucesso (representante cadastrado)',
    };
  }

  // -----------------------------
  // CONSULTAS
  // -----------------------------
  async getAllCompanies() {
    return this.companyRepo.findAll();
  }

  async findByCnpj(cnpj: string) {
    return this.companyRepo.findByCnpj(cnpj);
  }

  async findByEmail(email: string) {
    return this.companyRepo.findByEmail(email);
  }
}
