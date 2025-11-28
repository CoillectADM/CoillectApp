import { useEffect, useState } from "react";
import api from "../../../api/axios";

type Empresa = {
  id: number;
  name: string;
  iconeUrl?: string | null;
};

type Props = {
  onSelectCompany?: (companyId: number) => void;
  selectedId?: number | null;
};

export default function EmpresasList({ onSelectCompany, selectedId }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/company")
      .then((res) => setEmpresas(res.data.data || []))
      .catch(() => setEmpresas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Carregando empresas...</div>;

  const itemHeight = 56;
  const visibleItems = 3;

  return (
    <div style={{ margin: "24px 0" }}>
      <h5 style={{ textAlign: "center", marginBottom: 12 }}>
        Empresas coletoras cadastradas
      </h5>

      <div
        style={{
          maxHeight: itemHeight * visibleItems,
          overflowY: "auto",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {empresas.map((emp) => {
            const isSelected = emp.id === selectedId;
            return (
              <li
                key={emp.id}
                onClick={() => onSelectCompany && onSelectCompany(emp.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 8px",
                  borderBottom: "1px solid #333",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#3a3a3a" : "transparent",
                  transition: "background-color 0.15s ease",
                }}
              >
                {/* Ícone da empresa */}
                {emp.iconeUrl ? (
                  <img
                    src={emp.iconeUrl}
                    alt={`Ícone da empresa ${emp.name}`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#222",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#777",
                      fontSize: 10,
                    }}
                  >
                    Ícone
                  </div>
                )}

                <span
                  style={{
                    color: isSelected ? "#b3d36a" : "#8ca64e",
                    fontWeight: isSelected ? 600 : 500,
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {emp.name}
                </span>
              </li>
            );
          })}

          {empresas.length === 0 && (
            <li
              style={{ padding: "8px 4px", textAlign: "center", color: "#999" }}
            >
              Nenhuma empresa cadastrada
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
