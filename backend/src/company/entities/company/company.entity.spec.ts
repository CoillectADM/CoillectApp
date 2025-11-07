// src/company/entities/company.entity.spec.ts
import { Company } from './company.entity';

describe('Company Entity', () => {
  it('should create a company instance', () => {
    const company = new Company();
    company.name = 'GreenOil';
    company.email = 'contato@greenoil.com';
    company.password = 'hashedpassword';
    company.cnpj = '12.345.678/0001-90';
    company.description = 'Empresa especializada em reciclagem de óleo.';

    expect(company).toBeInstanceOf(Company);
    expect(company.name).toBe('GreenOil');
    expect(company.cnpj).toBe('12.345.678/0001-90');
  });
});
