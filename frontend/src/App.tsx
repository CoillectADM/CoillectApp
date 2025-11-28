import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import RegisterPage from "./pages/register-user/register/RegisterPage";
import LoginPage from "./pages/register-user/login";
import DashboardPage from "./pages/register-user/dashboard";
import RegisterCompanyPage from "./pages/register-company/RegisterCompanyPage";
import CompanyLoginPage from "./pages/company-login/CompanyLoginPage";
import CompanyHomePage from "./pages/company-login/CompanyHomePage";

import UserHomeMenu from "./pages/user-home/UserHomeMenu";
import UserHistoryPage from "./pages/user-home/UserHistoryPage";
import CompanyHomeMenu from "./pages/company-home/CompanyHomeMenu";
import CompanyHistoryPage from "./pages/company-home/CompanyHistoryPage";
import CompanyIconPage from "./pages/company-login/CompanyIconPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* área do usuário */}
        <Route path="/user-home" element={<UserHomeMenu />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/user-history" element={<UserHistoryPage />} />

        {/* empresa */}
        <Route path="/register-company" element={<RegisterCompanyPage />} />
        <Route path="/company-login" element={<CompanyLoginPage />} />
        <Route path="/company-home-menu" element={<CompanyHomeMenu />} />
        <Route path="/company-home" element={<CompanyHomePage />} />
        <Route path="/company-history" element={<CompanyHistoryPage />} />
        <Route path="/company-icon" element={<CompanyIconPage />} />

        {/* opcional: rota padrão */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
