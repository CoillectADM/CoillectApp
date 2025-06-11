import React, { useState } from 'react';
import type { Section } from './RegisterCompanyPage';


interface Step1Props {
  nextStep: () => void;
  updateData: (section: Section, data: any) => void;
}

export default function Step1({ nextStep, updateData }: Step1Props) {
  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    password: '',
    cnpj: '',
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyData({ ...companyData, [name]: value });
  };

  const handleNext = () => {
    updateData('company', companyData);
    nextStep();
  };

  return (
    <div className="step">
      <h3>Dados da Empresa</h3>
      <input type="text" name="name" placeholder="Nome da empresa" onChange={handleChange} />
      <input type="email" name="email" placeholder="E-mail" onChange={handleChange} />
      <input type="password" name="password" placeholder="Senha" onChange={handleChange} />
      <input type="text" name="cnpj" placeholder="CNPJ" onChange={handleChange} />
      <textarea name="description" placeholder="Descrição da empresa" onChange={handleChange} />

      <button onClick={handleNext}>Próximo</button>
    </div>
  );
}
