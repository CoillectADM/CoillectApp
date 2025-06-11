import { Test, TestingModule } from '@nestjs/testing';
import { CompanyRepository } from './company.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from '../../entities/company/company.entity';
import { Repository } from 'typeorm';

describe('CompanyRepository', () => {
  let repository: CompanyRepository;
  let mockRepo: Partial<Record<keyof Repository<Company>, jest.Mock>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 1, name: 'GreenOil' }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepository,
        {
          provide: getRepositoryToken(Company),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CompanyRepository>(CompanyRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create and save a company', async () => {
    const result = await repository.createCompany({ name: 'GreenOil' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.name).toBe('GreenOil');
  });

  it('should find company by CNPJ', async () => {
    await repository.findByCnpj('12.345.678/0001-90');
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { cnpj: '12.345.678/0001-90' } });
  });

  it('should return all companies', async () => {
    const result = await repository.findAll();
    expect(mockRepo.find).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
