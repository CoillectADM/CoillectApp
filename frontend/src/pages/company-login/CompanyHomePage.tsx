import { useEffect, useState } from "react";
import companyApi from "../../api/companyAxios";

type CollectionRequestStatus =
  | "PENDING"
  | "REFUSED"
  | "SCHEDULED"
  | "CANCELLED"
  | "COMPLETED";

type CompanyRequest = {
  id: number;
  status: CollectionRequestStatus;
  userAddressSnapshot?: string | null;
};

function formatStatus(status: CollectionRequestStatus) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "SCHEDULED":
      return "Agendada";
    case "REFUSED":
      return "Recusada";
    case "CANCELLED":
      return "Cancelada";
    case "COMPLETED":
      return "Concluída";
    default:
      return status;
  }
}

export default function CompanyHomePage() {
  const storedId = localStorage.getItem("company_id");
  const companyId = storedId ? Number(storedId) : undefined;

  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!companyId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#222",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
      >
        Empresa não identificada. Faça login novamente.
      </div>
    );
  }

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        setError(null);

        const res = await companyApi.get("/collection-request/company/active");
        const data = res.data && res.data.data ? res.data.data : [];
        setRequests(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar solicitações.");
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, []);

  async function handleAccept(id: number) {
    try {
      await companyApi.post(`/collection-request/${id}/accept`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? ({ ...r, status: "SCHEDULED" } as CompanyRequest) : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao aceitar solicitação.");
    }
  }

  async function handleRefuse(id: number) {
    try {
      await companyApi.post(`/collection-request/${id}/refuse`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? ({ ...r, status: "REFUSED" } as CompanyRequest) : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao recusar solicitação.");
    }
  }

  async function handleCancel(id: number) {
    try {
      await companyApi.post(`/collection-request/${id}/cancel`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? ({ ...r, status: "CANCELLED" } as CompanyRequest) : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao cancelar solicitação.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#222",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "40px",
      }}
    >
      <div style={{ marginBottom: "24px", fontSize: "2rem" }}>
        Bem-vindo, empresa!
      </div>

      <div style={{ marginTop: "40px", width: "100%", maxWidth: "800px" }}>
        <h2 style={{ marginBottom: "16px", fontSize: "1.5rem" }}>
          Solicitações de coleta pendentes
        </h2>

        {loading && <p>Carregando solicitações...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && !error && requests.length === 0 && (
          <p>Nenhuma solicitação pendente no momento.</p>
        )}

        {!loading &&
          !error &&
          requests.map((req) => (
            <div
              key={req.id}
              style={{
                border: "1px solid #555",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "12px",
                background: "#333",
              }}
            >
              <p>
                <strong>ID:</strong> {req.id}
              </p>
              <p>
                <strong>Status:</strong> {formatStatus(req.status)}
              </p>
              {req.userAddressSnapshot && (
                <p>
                  <strong>Endereço:</strong> {req.userAddressSnapshot}
                </p>
              )}

              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                {req.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleAccept(req.id)}
                      style={{
                        padding: "8px 16px",
                        background: "#4CAF50",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleRefuse(req.id)}
                      style={{
                        padding: "8px 16px",
                        background: "#d9534f",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Recusar
                    </button>
                  </>
                )}

                {req.status === "SCHEDULED" && (
                  <button
                    onClick={() => handleCancel(req.id)}
                    style={{
                      padding: "8px 16px",
                      background: "#f0ad4e",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
