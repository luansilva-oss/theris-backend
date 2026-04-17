import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AcoesPage } from './pages/AcoesPage';
import { AcaoDetailPage } from './pages/AcaoDetailPage';
import { MudancasPage } from './pages/MudancasPage';
import { MudancaDetailPage } from './pages/MudancaDetailPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { AcessoPage } from './pages/AcessoPage';

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/acoes" element={<AcoesPage />} />
          <Route path="/acoes/:id" element={<AcaoDetailPage />} />
          <Route path="/mudancas" element={<MudancasPage />} />
          <Route path="/mudancas/:id" element={<MudancaDetailPage />} />
          <Route path="/historico" element={<HistoricoPage />} />
          <Route path="/acesso" element={<AcessoPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
