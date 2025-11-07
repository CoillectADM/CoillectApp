// src/company/entities/company-contact.entity.spec.ts
import { CompanyContact } from './company-contact.entity';

describe('CompanyContact Entity', () => {
  it('should create a company contact instance', () => {
    const contact = new CompanyContact();
    contact.receptionPhone = '(11) 1234-5678';
    contact.adminPhone = '(11) 8765-4321';
    contact.extension = '204';
    contact.email = 'contato@empresa.com.br';

    expect(contact).toBeInstanceOf(CompanyContact);
    expect(contact.extension).toBe('204');
    expect(contact.email).toBe('contato@empresa.com.br');
  });
});
