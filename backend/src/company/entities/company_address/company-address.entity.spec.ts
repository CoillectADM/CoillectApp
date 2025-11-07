// src/company/entities/company-address.entity.spec.ts
import { CompanyAddress } from './company-address.entity';

describe('CompanyAddress Entity', () => {
  it('should create a company address instance', () => {
    const address = new CompanyAddress();
    address.cep = '12345-678';
    address.street = 'Rua das Palmeiras';
    address.number = '100';
    address.complement = 'Sala 201';
    address.neighborhood = 'Centro';
    address.city = 'São Paulo';
    address.state = 'SP';

    expect(address).toBeInstanceOf(CompanyAddress);
    expect(address.cep).toBe('12345-678');
    expect(address.city).toBe('São Paulo');
  });
});
