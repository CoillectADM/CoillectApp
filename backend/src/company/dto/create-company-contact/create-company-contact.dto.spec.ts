import { CreateCompanyContactDto } from './create-company-contact.dto';

describe('CreateCompanyContactDto', () => {
  it('should create a valid contact DTO', () => {
    const dto = new CreateCompanyContactDto();
    dto.receptionPhone = '(11) 1234-5678';
    dto.adminPhone = '(11) 8765-4321';
    dto.extension = '204';
    dto.email = 'contato@empresa.com.br';

    expect(dto).toBeInstanceOf(CreateCompanyContactDto);
    expect(dto.receptionPhone).toBe('(11) 1234-5678');
    expect(dto.email).toContain('@');
  });
});
