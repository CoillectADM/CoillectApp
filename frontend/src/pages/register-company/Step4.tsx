import React, { useState } from 'react';

type Section = 'company' | 'address' | 'contact' | 'representative';


interface Step4Props {
  prevStep: () => void;
  updateData: (section: Section, data: any) => void;
  submitData: () => void;
}

export default function Step4({ prevStep, updateData, submitData }: Step4Props) {
  const [repData, setRepData] = useState({
    name: '',
    cpf: '',
    position: '',
    commercialPhone: '',
    email: '',
    address: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRepData(prev => ({ ...prev, [name]: value }));
  };

    const handleSubmit = () => {
      console.log("📨 Dados do representante antes do submit:", repData);
      updateData('representative', repData);
    
      // Pequeno atraso para garantir que o estado seja atualizado antes de enviar
      setTimeout(() => {
        submitData();
      }, 0);
    };

  return (
    <div className="step">
      <h3>Representante da Empresa</h3>

      <input
        type="text"
        name="name"
        value={repData.name}
        placeholder="Nome completo (ex: João Silva)"
        onChange={handleChange}
      />

      <input
        type="text"
        name="cpf"
        value={repData.cpf}
        placeholder="CPF (somente números, ex: 12345678900)"
        onChange={handleChange}
      />

      <input
        type="text"
        name="position"
        value={repData.position}
        placeholder="Cargo (ex: Gerente de Operações)"
        onChange={handleChange}
      />

      <input
        type="text"
        name="commercialPhone"
        value={repData.commercialPhone}
        placeholder="Telefone Comercial (ex: (11) 94569-9654)"
        onChange={handleChange}
      />

      <input
        type="email"
        name="email"
        value={repData.email}
        placeholder="E-mail do representante (ex: joao@empresa.com)"
        onChange={handleChange}
      />

      <input
        type="text"
        name="address"
        value={repData.address}
        placeholder="Endereço (ex: Rua das Flores, 123)"
        onChange={handleChange}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <button onClick={prevStep}>Voltar</button>
        <button onClick={handleSubmit}>Finalizar Cadastro</button>
      </div>
    </div>
  );
}
