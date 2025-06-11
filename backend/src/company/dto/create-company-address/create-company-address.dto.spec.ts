import { CreateCompanyAddressDto } from './create-company-address.dto';

describe('CreateCompanyAddressDto', () => {
  it('should create a valid address DTO', () => {
    const dto = new CreateCompanyAddressDto();
    dto.cep = '12345-678';
    dto.street = 'Rua das Palmeiras';
    dto.number = '100';
    dto.complement = 'Sala 201';
    dto.neighborhood = 'Centro';
    dto.city = 'São Paulo';
    dto.state = 'SP';

    expect(dto).toBeInstanceOf(CreateCompanyAddressDto);
    expect(dto.city).toBe('São Paulo');
    expect(dto.state).toBe('SP');
  });
});
