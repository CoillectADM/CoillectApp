// src/company/entities/company-representative.entity.spec.ts
import { CompanyRepresentative } from './company-representative.entity';

describe('CompanyRepresentative Entity', () => {
  it('should create a company representative instance', () => {
    const rep = new CompanyRepresentative();
    rep.name = 'João Silva';
    rep.cpf = '123.456.789-00';
    rep.position = 'Diretor';
    rep.commercialPhone = '(11) 91234-5678';
    rep.email = 'joao@empresa.com.br';
    rep.address = 'Av. Central, 500 - São Paulo';

    expect(rep).toBeInstanceOf(CompanyRepresentative);
    expect(rep.name).toBe('João Silva');
    expect(rep.position).toBe('Diretor');
  });
});
