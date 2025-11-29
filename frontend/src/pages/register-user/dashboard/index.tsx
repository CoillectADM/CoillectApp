import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import "./mapaimg.jpg";
import EmpresasList from "./EmpresasList";
import {
  getMyActiveRequest,
  createCollectionRequest,
  cancelCollectionRequest,
  completeCollectionRequest,
} from "../../../services/api/collectionRequestApi";
import type { CollectionRequest } from "../../../types/collectionRequest";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [currentRequest, setCurrentRequest] =
    useState<CollectionRequest | null>(null);

  const [loading, setLoading] = useState(false);
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    async function loadActive() {
      try {
        const req = await getMyActiveRequest();
        setCurrentRequest(req ?? null);
      } catch {
        setCurrentRequest(null);
      }
    }
    loadActive();
  }, []);

  function hasActive(req: CollectionRequest | null): boolean {
    if (!req) return false;
    return req.status !== "CANCELLED" && req.status !== "COMPLETED";
  }

  function getInfoText(req: CollectionRequest | null) {
    if (!req) return "Nenhuma coleta em andamento.";

    switch (req.status) {
      case "PENDING":
        return "Coleta solicitada. Aguardando confirmação da empresa.";
      case "SCHEDULED":
        return req.scheduledDate
          ? `Coleta prevista para ${new Date(
              req.scheduledDate
            ).toLocaleDateString("pt-BR")}.`
          : "Coleta confirmada. Aguardando data da coleta.";
      case "REFUSED":
        return "Solicitação anterior recusada.";
      case "CANCELLED":
        return "Coleta cancelada.";
      case "COMPLETED":
        return "Coleta concluída. Obrigado por participar!";
      default:
        return "Nenhuma coleta em andamento.";
    }
  }

  const solicitarColetaClick = () => {
    setShowCompanyList(true);
  };

  const handleSelectCompany = (id: number) => {
    setSelectedCompanyId(id);
    setShowConfirmModal(true);
  };

  const confirmCreateRequest = async () => {
    if (!selectedCompanyId) return;
    try {
      setLoading(true);
      const req = await createCollectionRequest(selectedCompanyId);
      setCurrentRequest(req);
      setShowCompanyList(false);
      setShowConfirmModal(false);
    } catch {
      alert("Erro ao criar solicitação de coleta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const cancelarColeta = async () => {
    if (!currentRequest) return;
    try {
      setLoading(true);
      const updated = await cancelCollectionRequest(currentRequest.id);
      setCurrentRequest(updated);
    } catch {
      alert("Erro ao cancelar coleta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarColetaRealizada = async () => {
    if (!currentRequest) return;
    try {
      setLoading(true);
      const updated = await completeCollectionRequest(currentRequest.id);
      setCurrentRequest(updated);
    } catch {
      alert("Erro ao confirmar coleta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    navigate("/login");
  };

  const temAtiva = hasActive(currentRequest);

  return (
    <div className="dashboard-container">
      <div className="header">
        <h3>Solicite uma Coleta!</h3>
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

      {showCompanyList && (
        <EmpresasList
          selectedId={selectedCompanyId}
          onSelectCompany={handleSelectCompany}
        />
      )}

      {!showCompanyList && (
        <div id="mapa" className="mapa">
          <img src="./mapaimg" alt="" />
        </div>
      )}

      {loading && (
        <div className="spinner">
          <div className="spinner-border" role="status"></div>
          <p>Processando...</p>
        </div>
      )}

      {!loading && !temAtiva && (
        <div className="buttons">
          <button className="btn btn-success" onClick={solicitarColetaClick}>
            Solicitar Coleta
          </button>
        </div>
      )}

      {!loading && temAtiva && (
        <div className="buttons">
          <button className="btn btn-warning" onClick={cancelarColeta}>
            Cancelar solicitação
          </button>
        </div>
      )}

      {!loading && currentRequest && currentRequest.status === "SCHEDULED" && (
        <div className="buttons" style={{ marginTop: 8 }}>
          <button
            className="btn btn-info"
            style={{ backgroundColor: "#5bc0de", borderColor: "#5bc0de" }}
            onClick={confirmarColetaRealizada}
          >
            Coleta realizada
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h6>Informações da Coleta</h6>
          <p>{getInfoText(currentRequest)}</p>
        </div>
      </div>

      {showConfirmModal && selectedCompanyId && (
        <div className="modal">
          <div className="modal-content">
            <h5>Confirmar solicitação</h5>
            <p>Deseja solicitar coleta para a empresa selecionada?</p>
            <button onClick={confirmCreateRequest} disabled={loading}>
              {loading ? "Enviando..." : "Confirmar"}
            </button>
            <button onClick={() => setShowConfirmModal(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
