import { useNavigate } from "react-router-dom";
import "../user-home/user-home.css"; // reutiliza estilos básicos

export default function CompanyHomeMenu() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("company_token");
    localStorage.removeItem("company_id");
    navigate("/company-login");
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h2>Área da Empresa</h2>
        <div className="header-dropdown">
          <button className="header-avatar">☰</button>
          <div className="header-menu">
            <button type="button" onClick={() => alert("Configurações em breve")}>
              Configurações
            </button>
            <button type="button" onClick={() => alert("Ajuda em breve")}>
              Ajuda
            </button>
            <button type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <button
          className="home-button primary"
          onClick={() => navigate("/company-home")}
        >
          Solicitações de coleta
        </button>

        <button
          className="home-button"
          onClick={() => navigate("/company-history")}
        >
          Histórico de coletas
        </button>

        <button
          className="home-button"
          onClick={() => navigate("/company-icon")}
        >
          Escolher ícone
        </button>
      </main>
    </div>
  );
}
