import { CreateCompanyDto } from './create-company.dto';

describe('CreateCompanyDto', () => {
  it('should create a DTO with valid values', () => {
    const dto = new CreateCompanyDto();
    dto.name = 'GreenOil';
    dto.email = 'contato@greenoil.com';
    dto.password = '123456';
    dto.cnpj = '12.345.678/0001-90';

    expect(dto).toBeInstanceOf(CreateCompanyDto);
    expect(dto.name).toBe('GreenOil');
    expect(dto.email).toContain('@');
  });
});
