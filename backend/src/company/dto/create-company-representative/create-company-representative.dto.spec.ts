import { CreateCompanyRepresentativeDto } from './create-company-representative.dto';

describe('CreateCompanyRepresentativeDto', () => {
  it('should create a valid representative DTO', () => {
    const dto = new CreateCompanyRepresentativeDto();
    dto.name = 'João Silva';
    dto.cpf = '123.456.789-00';
    dto.position = 'Diretor';
    dto.commercialPhone = '(11) 91234-5678';
    dto.email = 'joao@empresa.com.br';
    dto.address = 'Av. Central, 500 - São Paulo';

    expect(dto).toBeInstanceOf(CreateCompanyRepresentativeDto);
    expect(dto.name).toBe('João Silva');
    expect(dto.position).toBe('Diretor');
  });
});
