import React, { useState } from 'react';

type Section = 'company' | 'address' | 'contact' | 'representative';



interface Step3Props {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (section: Section, data: any) => void;
}

export default function Step3({ nextStep, prevStep, updateData }: Step3Props) {
  const [contactData, setContactData] = useState({
    receptionPhone: '',
    adminPhone: '',
    extension: '',
    email: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactData({ ...contactData, [name]: value });
  };

  const handleNext = () => {
    updateData('contact', contactData);
    nextStep();
  };

  return (
    <div className="step">
      <h3>Contatos da Empresa</h3>
      <input type="text" name="receptionPhone" placeholder="Telefone Recepção" onChange={handleChange} />
      <input type="text" name="adminPhone" placeholder="Telefone Administração" onChange={handleChange} />
      <input type="text" name="extension" placeholder="Ramal" onChange={handleChange} />
      <input type="email" name="email" placeholder="E-mail de contato" onChange={handleChange} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button onClick={prevStep}>Voltar</button>
        <button onClick={handleNext}>Próximo</button>
      </div>
    </div>
  );
}
