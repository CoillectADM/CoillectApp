import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../../api";
import "./company-login.css";
import Logo from "../../components/Logo";

type CompanyTokenPayload = {
  sub: number;   // id da empresa
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

type LoginForm = {
  email: string;
  password: string;
};

export default function CompanyLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post<{ access_token: string }>("/auth/company/login", form);

      const token = res.data.access_token as string;

      console.log("Token da empresa:", token);
      setMessage("Login realizado com sucesso");

      localStorage.setItem("company_token", token);

      const payload = jwtDecode<CompanyTokenPayload>(token);
      if (payload?.sub) {
        localStorage.setItem("company_id", String(payload.sub));
      }

      setTimeout(() => navigate("/company-home-menu"), 900);
    } catch (err: any) {
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
