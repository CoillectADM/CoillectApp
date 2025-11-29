import { useNavigate } from "react-router-dom";
import "./user-home.css";
import Logo1 from "../../assets/Logo1.png";

export default function UserHomeMenu() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-top-bar">
          <img src={Logo1} alt="Coillect" className="home-logo" />

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
        </div>

        <h2 className="home-title">Bem-vindo à Coillect!</h2>
      </header>

      <main className="home-main">
        <button
          className="home-button primary"
          onClick={() => navigate("/dashboard")}
        >
          Solicitar coleta
        </button>

        <button
          className="home-button"
          onClick={() => navigate("/user-history")}
        >
          Histórico de coletas
        </button>
      </main>
    </div>
  );
}
