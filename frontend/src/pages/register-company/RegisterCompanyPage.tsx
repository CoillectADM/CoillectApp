import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import axios from 'axios';
import './register-company.css';


export type Section = 'company' | 'address' | 'contact' | 'representative';

interface CompanyFormData {
  company: Record<string, any>;
  address: Record<string, any>;
  contact: Record<string, any>;
  representative: Record<string, any>;
}

export default function RegisterCompanyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CompanyFormData>({
    company: {},
    address: {},
    contact: {},
    representative: {},
  });

  useEffect(() => {
    console.log('🔄 Página RegisterCompanyPage montada. Etapa inicial:', step);
  }, []);

  const nextStep = () => {
    console.log(`➡️ Indo para a próxima etapa: ${step + 1}`);
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    console.log(`⬅️ Retornando para etapa anterior: ${step - 1}`);
    setStep((prev) => prev - 1);
  };

  const updateData = (section: Section, data: any) => {
    console.log(`📝 Atualizando seção "${section}" com dados:`, data);
    setFormData((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          ...data,
        },
      };
      console.log('🗃️ Estado atualizado do formulário:', updated);
      return updated;
    });
  };

  const validateFields = (): boolean => {
    console.log('🔎 Iniciando validação dos dados antes do envio...');
    const { company, contact, representative } = formData;

    console.log('📋 Dados para validação:');
    console.log(' - Company:', company);
    console.log(' - Contact:', contact);
    console.log(' - Representative:', representative);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cnpjRegex = /^\d{14}$/;
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;

    if (!emailRegex.test(company.email)) {
      alert('⚠️ E-mail da empresa inválido.');
      return false;
    }
    if (!emailRegex.test(contact.email)) {
      alert('⚠️ E-mail de contato inválido.');
      return false;
    }
    if (!emailRegex.test(representative.email)) {
      alert('⚠️ E-mail do representante inválido.');
      return false;
    }

    const sanitizedCNPJ = company.cnpj.replace(/\D/g, '');
    console.log('🔢 CNPJ sanitizado:', sanitizedCNPJ);
    if (!cnpjRegex.test(sanitizedCNPJ)) {
      alert('⚠️ CNPJ inválido. Use apenas números (14 dígitos).');
      return false;
    }

    const phones = [contact.receptionPhone, contact.adminPhone, representative.commercialPhone];
    phones.forEach((p, i) => console.log(`📞 Telefone [${i}]:`, p));
    if (!phones.every(phone => phoneRegex.test(phone))) {
      alert('⚠️ Verifique os telefones. Use formato (11) 91234-5678.');
      return false;
    }

    console.log('✅ Validação concluída com sucesso.');
    return true;
  };

  const submitData = async () => {
    console.log('📤 Tentando submeter os dados...');
    if (!validateFields()) {
      console.warn('🚫 Validação falhou. Envio cancelado.');
      return;
    }

    console.log('📦 Dados finalizados para envio:', JSON.stringify(formData, null, 2));

    try {
      const response = await axios.post('http://localhost:3000/api/company/register', formData);
      console.log('✅ Empresa cadastrada com sucesso!');
      console.log('🧾 Resposta do backend:', response.data);
      alert('Cadastro realizado com sucesso!');

      setFormData({
        company: {},
        address: {},
        contact: {},
        representative: {},
      });
      setStep(1);
      navigate('/login');
    } catch (err: any) {
      console.error('❌ Erro ao cadastrar empresa:', err);
      console.error('📨 Resposta do backend:', err.response?.data);
      alert('Erro no cadastro. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="register-company-container">
      <h2>Cadastro de Empresa - Etapa {step}/4</h2>

      {/* 🔵 Barra de progresso visual */}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${(step / 4) * 100}%` }}
        ></div>
      </div>

      {/* Formulário dividido por etapas */}
      {step === 1 && <Step1 nextStep={nextStep} updateData={updateData} />}
      {step === 2 && <Step2 nextStep={nextStep} prevStep={prevStep} updateData={updateData} />}
      {step === 3 && <Step3 nextStep={nextStep} prevStep={prevStep} updateData={updateData} />}
      {step === 4 && <Step4 prevStep={prevStep} updateData={updateData} submitData={submitData} />}
    </div>
  );
}
