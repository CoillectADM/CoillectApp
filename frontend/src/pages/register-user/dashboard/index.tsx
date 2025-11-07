import { useState } from 'react'; // Adicionando o import correto
import { useNavigate } from 'react-router-dom';
import './dashboard.css';  // Importando o CSS correto
import './mapaimg.jpg';

export default function DashboardPage() {
  const [coletaAtiva, setColetaAtiva] = useState(false);
  const [infoColeta, setInfoColeta] = useState("Nenhuma coleta em andamento.");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const solicitarColeta = () => {
    setLoading(true);
    setInfoColeta("Solicitando coleta...");
    setTimeout(() => {
      setColetaAtiva(true);
      setLoading(false);
      setInfoColeta("Coleta solicitada. Aguardando confirmação.");
    }, 2000); // 2 segundos de delay
  };

  const cancelarColeta = () => {
    setColetaAtiva(false);
    setInfoColeta("Coleta cancelada.");
  };

  const logout = () => {
    // Ação de logout
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h3>Dashboard Usuário</h3>
        <div className="dropdown">
          <button className="dropdown-toggle">
            <i className="bi bi-person-circle"></i>
          </button>
          <div className="dropdown-menu">
            <button onClick={() => alert("Ajuda")}>Ajuda</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div id="mapa" className="mapa">
        <img src="./mapaimg" alt="" />
      </div>

      {/* Spinner de loading */}
      {loading && (
        <div className="spinner">
          <div className="spinner-border" role="status"></div>
          <p>Solicitando coleta...</p>
        </div>
      )}

      {/* Botões */}
      {!loading && !coletaAtiva && (
        <div className="buttons">
          <button className="btn btn-success" onClick={solicitarColeta}>
            Solicitar Coleta
          </button>
          <button className="btn btn-warning d-none" onClick={cancelarColeta}>
            Cancelar Coleta
          </button>
        </div>
      )}

      {/* Informações */}
      <div className="card">
        <div className="card-body">
          <h6>Informações da Coleta</h6>
          <p>{infoColeta}</p>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {coletaAtiva && (
        <div className="modal">
          <div className="modal-content">
            <h5>Confirmar Cancelamento</h5>
            <p>Tem certeza que deseja cancelar a coleta?</p>
            <button onClick={cancelarColeta}>Confirmar Cancelamento</button>
            <button onClick={() => setColetaAtiva(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
