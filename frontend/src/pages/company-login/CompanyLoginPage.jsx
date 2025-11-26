import { useState } from "react";
import api from "../../api";
import "./company-login.css";
import Logo from "../../components/Logo";
import { useNavigate } from "react-router-dom";

export default function CompanyLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/auth/company/login", form);
      console.log("Token da empresa:", res.data.access_token);
      setMessage("Login realizado com sucesso");
      localStorage.setItem("company_token", res.data.access_token);
      setTimeout(() => navigate('/company-home'), 900); // Redireciona após 0.9s
    } catch (err) {
      setMessage(
        err?.response?.data?.message ||
        "Erro ao logar. Verifique e tente novamente."
      );
    }
    setLoading(false);
  }

  return (
    <div className="company-login-container">
      <Logo />
      <form onSubmit={handleSubmit}>
        <h2>Login Empresa</h2>
        <input
          type="email"
          name="email"
          placeholder="E-mail da empresa"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          Entrar
        </button>
        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
}
