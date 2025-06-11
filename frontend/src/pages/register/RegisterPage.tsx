import { useState } from 'react';
import Step1 from './step1';
import Step2 from './Step2';
import Step3 from './step3';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import React from 'react';

// Tipagem do formData
interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  data_nascimento: string; // Data de nascimento
  status_email: boolean;
  rua: string;
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
}

// Tipagem dos erros
interface Errors {
  [key: string]: string;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    data_nascimento: '', // Iniciar com um valor vazio
    status_email: true,
    rua: '',
    cep: '',
    cidade: '',
    estado: '',
    telefone: '',
  });

  const [userId, setUserId] = useState<number | null>(null); // Tipagem do userId
  const [errors, setErrors] = useState<Errors>({});
  const navigate = useNavigate();

  // Função para formatar a data de nascimento
  const formatDate = (date: string): string => {
    const [year, month, day] = date.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`; // Formato DD/MM/YYYY
  };

  // Função para avançar para a próxima etapa
  const nextStep = async () => {
    try {
      if (step === 1) {
        if (!validateStep1()) return;

        const formattedDate = formatDate(formData.data_nascimento);

        const userRes = await axios.post('http://localhost:3201/api/user', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          data_nascimento: formattedDate,
          status_email: formData.status_email,
        });

        setUserId(userRes.data.data.id); // Guarda o ID do usuário para a próxima etapa
        setStep(2);
      
      } else if (step === 2) {
        if (!validateStep2()) return;

        await axios.post(`http://localhost:3201/api/user/address/${userId}`, {
          rua: formData.rua,
          cep: formData.cep,
          cidade: formData.cidade,
          estado: formData.estado,
        });

        setStep(3);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar. Verifique os dados.');
    }
  };

  // Função para voltar para a etapa anterior
  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  // Função para atualizar o formData
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Função de validação da etapa 1
  const validateStep1 = (): boolean => {
    const newErrors: Errors = {};
    if (!formData.name) newErrors.name = "Nome é obrigatório";
    if (!formData.email) newErrors.email = "Email é obrigatório";
    if (!formData.password) newErrors.password = "Senha é obrigatória";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }
    if (!formData.data_nascimento) newErrors.data_nascimento = "Data de nascimento é obrigatória"; // Validação para a data de nascimento
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função de validação da etapa 2
  const validateStep2 = (): boolean => {
    const newErrors: Errors = {};
    if (!formData.rua) newErrors.rua = "Rua é obrigatória";
    if (!formData.cep) newErrors.cep = "CEP é obrigatório";
    if (!formData.cidade) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado) newErrors.estado = "Estado é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função de envio dos dados na etapa final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:3201/api/user/phone_number/${userId}`, {
        telefone: formData.telefone,
      });

      alert('Cadastro realizado com sucesso!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar telefone. Verifique os dados.');
    }
  };

  return (
    <div className="register-container">
      <h2>Cadastro</h2>
      {step === 1 && (
        <Step1 
          formData={formData} 
          handleChange={handleChange} 
          nextStep={nextStep} 
          errors={errors} 
        />
      )}
      {step === 2 && (
        <Step2 
          formData={formData} 
          handleChange={handleChange} 
          onNext={nextStep} 
          onPrev={prevStep} 
          errors={errors} 
        />
      )}
      {step === 3 && (
        <Step3 
          formData={formData} 
          handleChange={handleChange} 
          onPrev={prevStep} 
          onSubmit={handleSubmit} 
        />
      )}
    </div>
  );
}
