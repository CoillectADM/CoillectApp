import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleLogin = async (e: React.FormEvent) => { 
  e.preventDefault();
  try {
    const response = await axios.post('http://localhost:3201/api/api/auth/login', {
      email,
      password,
    });

    // Você pode salvar o token aqui se quiser
    const token = response.data.access_token;
    console.log('Token:', token);

    // Redireciona para o dashboard
    navigate('/dashboard');
  } catch (error) {
    alert('Email ou senha inválidos');
  }
};


  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
