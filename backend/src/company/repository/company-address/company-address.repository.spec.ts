import { Test, TestingModule } from '@nestjs/testing';
import { CompanyAddressRepository } from './company-address.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyAddress } from '../../entities/company_address/company-address.entity';
import { Repository } from 'typeorm';

describe('CompanyAddressRepository', () => {
  let repository: CompanyAddressRepository;
  let mockRepo: Partial<Record<keyof Repository<CompanyAddress>, jest.Mock>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 1, city: 'São Paulo' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyAddressRepository,
        {
          provide: getRepositoryToken(CompanyAddress),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CompanyAddressRepository>(CompanyAddressRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create and save an address', async () => {
    const result = await repository.createAddress({ city: 'São Paulo' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.city).toBe('São Paulo');
  });

  it('should return all addresses', async () => {
    const result = await repository.findAll();
    expect(mockRepo.find).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
