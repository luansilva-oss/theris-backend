import { NavLink } from 'react-router-dom';
import { LayoutDashboard, RefreshCw, AlertTriangle, Clock, Users, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/acoes', icon: RefreshCw, label: 'Ações Recorrentes' },
  { to: '/mudancas', icon: AlertTriangle, label: 'Mudanças Urgentes' },
  { to: '/historico', icon: Clock, label: 'Histórico' },
  { to: '/acesso', icon: Users, label: 'Acesso' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col border-r"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}>
          Grupo 3C
        </div>
        <div className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
          SGSI Dashboard
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'font-medium'
                  : 'hover:opacity-80'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-xs font-medium truncate mb-0.5" style={{ color: 'var(--color-text)' }}>
          {user?.name}
        </div>
        <div className="text-xs truncate mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs w-full hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  );
}
