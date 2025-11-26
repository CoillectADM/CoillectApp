import { useState } from 'react';
import api from '../../api'; 
import './register-company.css';

export default function RegisterCompanyPage() {
  // Estado do formulário único
  const [form, setForm] = useState({
    // Company
    name: '',
    email: '',
    cnpj: '',
    password: '',
    // Address
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    // Contact
    receptionPhone: '',
    adminPhone: '',
    extension: '',
    contactEmail: '',
    // Representative
    repName: '',
    repCpf: '',
    repPosition: '',
    repCommercialPhone: '',
    repEmail: '',
    repAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = {
        company: {
          name: form.name,
          email: form.email,
          cnpj: form.cnpj,
          password: form.password,
        },
        address: {
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          cep: form.cep,
        },
        contact: {
          receptionPhone: form.receptionPhone,
          adminPhone: form.adminPhone,
          extension: form.extension,
          email: form.contactEmail,
        },
        representative: {
          name: form.repName,
          cpf: form.repCpf,
          position: form.repPosition,
          commercialPhone: form.repCommercialPhone,
          email: form.repEmail,
          address: form.repAddress,
        },
      };
      const res = await api.post('/company/register', payload);
      setMessage(res.data.message || 'Cadastro realizado com sucesso!');
    } catch (err: any) {
      setMessage(
        err?.response?.data?.message ||
        'Erro ao cadastrar. Verifique os dados e tente novamente.'
      );
    }
    setLoading(false);
  }

  return (
    <div className="register-company-container">
      <form onSubmit={handleSubmit}>
        <h2>Cadastro de Empresa Coletora</h2>

        {/* Bloco 1: Dados básicos da empresa */}
        <h3>Dados da empresa</h3>
        <input name="name" placeholder="Nome da empresa" value={form.name} onChange={handleChange} required />
        <input name="email" placeholder="E-mail da empresa" value={form.email} onChange={handleChange} required />
        <input name="cnpj" placeholder="CNPJ" value={form.cnpj} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Senha" value={form.password} onChange={handleChange} required />

        {/* Bloco 2: Endereço */}
        <h3>Endereço</h3>
        <input name="street" placeholder="Rua" value={form.street} onChange={handleChange} required />
        <input name="number" placeholder="Número" value={form.number} onChange={handleChange} required />
        <input name="neighborhood" placeholder="Bairro" value={form.neighborhood} onChange={handleChange} required />
        <input name="city" placeholder="Cidade" value={form.city} onChange={handleChange} required />
        <input name="state" placeholder="Estado" value={form.state} onChange={handleChange} required />
        <input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} required />

        {/* Bloco 3: Contato */}
        <h3>Contato administrativo</h3>
        <input name="receptionPhone" placeholder="Telefone Recepção" value={form.receptionPhone} onChange={handleChange} required />
        <input name="adminPhone" placeholder="Telefone Administrativo" value={form.adminPhone} onChange={handleChange} required />
        <input name="extension" placeholder="Ramal" value={form.extension} onChange={handleChange} required />
        <input name="contactEmail" placeholder="E-mail do contato" value={form.contactEmail} onChange={handleChange} required />

        {/* Bloco 4: Representante */}
        <h3>Representante legal</h3>
        <input name="repName" placeholder="Nome completo" value={form.repName} onChange={handleChange} required />
        <input name="repCpf" placeholder="CPF" value={form.repCpf} onChange={handleChange} required />
        <input name="repPosition" placeholder="Cargo" value={form.repPosition} onChange={handleChange} required />
        <input name="repCommercialPhone" placeholder="Telefone comercial" value={form.repCommercialPhone} onChange={handleChange} required />
        <input name="repEmail" placeholder="E-mail do representante" value={form.repEmail} onChange={handleChange} required />
        <input name="repAddress" placeholder="Endereço do representante" value={form.repAddress} onChange={handleChange} required />

        <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
          Finalizar Cadastro
        </button>
        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
}
