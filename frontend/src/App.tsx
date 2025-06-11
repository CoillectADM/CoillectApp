import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegisterPage from './pages/register/RegisterPage';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';  // Certifique-se de importar corretamente
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
        
        {/* Outras rotas que você tenha */}
      </Routes>
    </Router>
  );
}

export default App;
