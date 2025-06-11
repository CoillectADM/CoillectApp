import React from 'react';
import './register.css';

interface Step3Props {
  formData: {
    telefone: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrev: () => void;
  onSubmit: (e: React.FormEvent) => void;  // Tipo correto para o evento
}

const Step3: React.FC<Step3Props> = ({ formData, handleChange, onPrev, onSubmit }) => {
  const isFormValid = formData.telefone;

  return (
    <div>
      <label>Telefone</label>
      <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} />
      
      <button onClick={onPrev}>Back</button>
      <button disabled={!isFormValid} onClick={(e) => onSubmit(e)}>Submit</button>
    </div>
  );
};

export default Step3;
