import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/register-user/register/RegisterPage';
import LoginPage from './pages/register-user/login';
import DashboardPage from './pages/register-user/dashboard';  // Certifique-se de importar corretamente
import RegisterCompanyPage from './pages/register-company/RegisterCompanyPage';
import CompanyLoginPage from './pages/company-login/CompanyLoginPage';
import CompanyHomePage from './pages/company-login/CompanyHomePage';



// Outras importações...

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota para Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rota para Registro */}
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Rota para o Dashboard (após login) */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        <Route path="/register-company" element={<RegisterCompanyPage />} />

        <Route path="/company-login" element={<CompanyLoginPage />} />

        <Route path="/company-home" element={<CompanyHomePage />} />

        {/* Outras rotas que você tenha */}
      </Routes>
    </Router>
  );
}

export default App;
