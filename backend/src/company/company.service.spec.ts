import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { CompanyRepository } from './repository/company/company.repository';
import { CompanyAddressRepository } from './repository/company-address/company-address.repository';
import { CompanyContactRepository } from './repository/company-contact/company-contact.repository';
import { CompanyRepresentativeRepository } from './repository/company-representative/company-representative.repository';

describe('CompanyService', () => {
  let service: CompanyService;

  const mockCompanyRepo = {
    createCompany: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    findByCnpj: jest.fn().mockResolvedValue(null),
  };

  const mockAddressRepo = {
    createAddress: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockContactRepo = {
    createContact: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockRepRepo = {
    createRepresentative: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: CompanyRepository, useValue: mockCompanyRepo },
        { provide: CompanyAddressRepository, useValue: mockAddressRepo },
        { provide: CompanyContactRepository, useValue: mockContactRepo },
        { provide: CompanyRepresentativeRepository, useValue: mockRepRepo },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a full company structure', async () => {
    const result = await service.createCompany(
        {
          name: 'GreenOil',
          email: 'contato@greenoil.com',
          password: '123456',
          cnpj: '12.345.678/0001-90',
          description: 'Empresa de reciclagem'
        },
        {
          cep: '12345-678',
          street: 'Rua das Palmeiras',
          number: '100',
          complement: 'Sala 201',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
        },
        {
          receptionPhone: '(11) 1234-5678',
          adminPhone: '(11) 8765-4321',
          extension: '204',
          email: 'contato@empresa.com.br',
        },
        {
          name: 'João Silva',
          cpf: '123.456.789-00',
          position: 'Diretor',
          commercialPhone: '(11) 91234-5678',
          email: 'joao@empresa.com.br',
          address: 'Av. Central, 500 - São Paulo',
        }
    );  
    });

  it('should return all companies', async () => {
    const companies = await service.getAllCompanies();
    expect(Array.isArray(companies)).toBe(true);
  });

  it('should find by CNPJ', async () => {
    await service.findByCnpj('00.000.000/0001-00');
    expect(mockCompanyRepo.findByCnpj).toHaveBeenCalled();
  });
});
