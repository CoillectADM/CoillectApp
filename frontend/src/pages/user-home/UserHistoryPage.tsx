import { useEffect, useState } from "react";
import { getMyHistory } from "../../services/api/collectionRequestApi";
import type { CollectionRequest } from "../../types/collectionRequest";
import "./user-home.css";

export default function UserHistoryPage() {
  const [items, setItems] = useState<CollectionRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getMyHistory();
        setItems(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <h2>Histórico de coletas (Usuário)</h2>
      </header>

      <main className="home-main">
        {loading && <p>Carregando...</p>}
        {!loading && items.length === 0 && (
          <p>Nenhuma coleta finalizada encontrada.</p>
        )}

        {!loading && items.length > 0 && (
          <table className="history-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>CPF</th>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Data solicitação</th>
                <th>Data coleta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.user?.name ?? "N/A"}</td>
                  <td>{(r as any).userCpfSnapshot ?? "-"}</td>
                  <td>{r.company?.name}</td>
                  <td>{(r as any).companyCnpjSnapshot ?? "-"}</td>
                  <td>
                    {new Date(r.requestedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    {r.scheduledDate
                      ? new Date(r.scheduledDate).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
