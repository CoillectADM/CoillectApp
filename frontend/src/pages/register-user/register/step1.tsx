import React from 'react';
import './register.css';
interface Step1Props {
  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    data_nascimento: string; // Incluindo data de nascimento no formData
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nextStep: () => void;
  errors: { [key: string]: string };
}

const Step1: React.FC<Step1Props> = ({ formData, handleChange, nextStep, errors }) => {
  const isFormValid = formData.name && formData.email && formData.password && formData.password === formData.confirmPassword && formData.data_nascimento;

  return (
    <div>
      
      <label>Name</label>
      <input type="text" name="name" value={formData.name} onChange={handleChange} />
      {errors.name && <span>{errors.name}</span>}
      
      <label>Email</label>
      <input type="email" name="email" value={formData.email} onChange={handleChange} />
      {errors.email && <span>{errors.email}</span>}
      
      <label>Password</label>
      <input type="password" name="password" value={formData.password} onChange={handleChange} />
      {errors.password && <span>{errors.password}</span>}
      
      <label>Confirm Password</label>
      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
      {errors.confirmPassword && <span>{errors.confirmPassword}</span>}
      
      <label>Data de Nascimento</label>
      <input type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} />
      {errors.data_nascimento && <span>{errors.data_nascimento}</span>}
      
      <button disabled={!isFormValid} onClick={nextStep}>Next</button>
    </div>
  );
};

export default Step1;
