import { Test, TestingModule } from '@nestjs/testing';
import { CompanyContactRepository } from './company-contact.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanyContact } from '../../entities/company_contact/company-contact.entity';
import { Repository } from 'typeorm';

describe('CompanyContactRepository', () => {
  let repository: CompanyContactRepository;
  let mockRepo: Partial<Record<keyof Repository<CompanyContact>, jest.Mock>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 1, receptionPhone: '(11) 1234-5678' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyContactRepository,
        {
          provide: getRepositoryToken(CompanyContact),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CompanyContactRepository>(CompanyContactRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create and save a contact', async () => {
    const result = await repository.createContact({ receptionPhone: '(11) 1234-5678' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.receptionPhone).toBe('(11) 1234-5678');
  });

  it('should return all contacts', async () => {
    const result = await repository.findAll();
    expect(mockRepo.find).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
