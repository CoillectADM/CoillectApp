import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

describe('CompanyController', () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockService = {
    createCompany: jest.fn().mockResolvedValue('mockCompany'),
    getAllCompanies: jest.fn().mockResolvedValue(['mockCompany']),
    findByCnpj: jest.fn().mockResolvedValue('mockCompany'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service to create company', async () => {
    const result = await controller.register(
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
    const result = await controller.findAll();
    expect(service.getAllCompanies).toHaveBeenCalled();
    expect(result).toEqual(['mockCompany']);
  });

  it('should return company by cnpj', async () => {
    const result = await controller.findByCnpj('00.000.000/0001-00');
    expect(service.findByCnpj).toHaveBeenCalledWith('00.000.000/0001-00');
    expect(result).toBe('mockCompany');
  });
});
