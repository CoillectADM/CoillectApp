import CompanyIconUpload from "../company-login/CompanyIconUpload";
import "../user-home/user-home.css";

export default function CompanyIconPage() {
  const storedId = localStorage.getItem("company_id");
  const companyId = storedId ? Number(storedId) : undefined;

  if (!companyId) {
    return <p>Empresa não identificada. Faça login novamente.</p>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h2>Escolher ícone da empresa</h2>
      </header>
      <main className="home-main">
        <CompanyIconUpload companyId={companyId} />
      </main>
    </div>
  );
}
