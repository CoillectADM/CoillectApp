import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import './login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    // Pega o access_token que o backend retorna
    const token = response.data.access_token;
    console.log("Token:", token);

    // Salva no localStorage com a mesma chave que o interceptor usa
    localStorage.setItem("token", token);

    // Redireciona para o dashboard
    navigate("/user-home");
  } catch (error) {
    alert("Email ou senha inválidos");
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
