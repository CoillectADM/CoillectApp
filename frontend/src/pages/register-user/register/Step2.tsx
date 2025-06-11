import React from 'react';
import './register.css';

interface Step2Props {
  formData: {
    rua: string;
    cep: string;
    cidade: string;
    estado: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onPrev: () => void;
  errors: { [key: string]: string };
}

const Step2: React.FC<Step2Props> = ({ formData, handleChange, onNext, onPrev, errors }) => {
  const isFormValid = formData.rua && formData.cep && formData.cidade && formData.estado;

  return (
    <div>
      <label>Rua</label>
      <input type="text" name="rua" value={formData.rua} onChange={handleChange} />
      {errors.rua && <span>{errors.rua}</span>}
      
      <label>CEP</label>
      <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
      {errors.cep && <span>{errors.cep}</span>}
      
      <label>Cidade</label>
      <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} />
      {errors.cidade && <span>{errors.cidade}</span>}
      
      <label>Estado</label>
      <input type="text" name="estado" value={formData.estado} onChange={handleChange} />
      {errors.estado && <span>{errors.estado}</span>}
      
      <button onClick={onPrev}>Back</button>
      <button disabled={!isFormValid} onClick={onNext}>Next</button>
    </div>
  );
};

export default Step2;
