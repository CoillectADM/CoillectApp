import React, { useState } from 'react';
import type { Section } from './RegisterCompanyPage';


interface Step2Props {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (section: Section, data: any) => void;
}

export default function Step2({ nextStep, prevStep, updateData }: Step2Props) {
  const [addressData, setAddressData] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressData({ ...addressData, [name]: value });
  };

  const handleNext = () => {
    updateData('address', addressData);
    nextStep();
  };

  return (
    <div className="step">
      <h3>Endereço da Empresa</h3>
      <input type="text" name="cep" placeholder="CEP" onChange={handleChange} />
      <input type="text" name="street" placeholder="Rua" onChange={handleChange} />
      <input type="text" name="number" placeholder="Número" onChange={handleChange} />
      <input type="text" name="complement" placeholder="Complemento" onChange={handleChange} />
      <input type="text" name="neighborhood" placeholder="Bairro" onChange={handleChange} />
      <input type="text" name="city" placeholder="Cidade" onChange={handleChange} />
      <input type="text" name="state" placeholder="Estado" onChange={handleChange} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button onClick={prevStep}>Voltar</button>
        <button onClick={handleNext}>Próximo</button>
      </div>
    </div>
  );
}
