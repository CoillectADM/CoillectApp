import { Test, TestingModule } from '@nestjs/testing';
import { CompanyRepresentativeRepository } from './company-representative.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyRepresentative } from '../../entities/company_representative/company-representative.entity';
import { Repository } from 'typeorm';

describe('CompanyRepresentativeRepository', () => {
  let repository: CompanyRepresentativeRepository;
  let mockRepo: Partial<Record<keyof Repository<CompanyRepresentative>, jest.Mock>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 1, name: 'João Silva' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepresentativeRepository,
        {
          provide: getRepositoryToken(CompanyRepresentative),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CompanyRepresentativeRepository>(CompanyRepresentativeRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create and save a representative', async () => {
    const result = await repository.createRepresentative({ name: 'João Silva' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.name).toBe('João Silva');
  });

  it('should return all representatives', async () => {
    const result = await repository.findAll();
    expect(mockRepo.find).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
