import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, ArrowRight } from 'lucide-react';
import { getActions, getChanges } from '../lib/api';
import type { Action, Change } from '../lib/api';
import { StatusBadge } from '../components/shared/StatusBadge';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export function DashboardPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getActions(), getChanges()])
      .then(([a, c]) => { setActions(a); setChanges(c); })
      .finally(() => setLoading(false));
  }, []);

  const overdue = actions.filter(a => a.status === 'OVERDUE');
  const dueSoon = actions.filter(a => a.status === 'DUE_SOON');
  const onTrack = actions.filter(a => ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(a.status));
  const openChanges = changes.filter(c => c.status !== 'CLOSED');

  const urgentFeed = [...overdue, ...dueSoon].slice(0, 5);

  const metrics = [
    { label: 'Em dia', value: onTrack.length, icon: CheckCircle, color: '#22c55e' },
    { label: 'Vencendo em breve', value: dueSoon.length, icon: Clock, color: '#f59e0b' },
    { label: 'Atrasadas', value: overdue.length, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Mudanças abertas', value: openChanges.length, icon: RefreshCw, color: '#8b5cf6' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64"
        style={{ color: 'var(--color-text-muted)' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Estado atual do SGSI — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-5 border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Feed urgente */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Ações que precisam de atenção
          </h2>
          <Link to="/acoes" className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-primary)' }}>
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>

        {urgentFeed.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            ✅ Nenhuma ação atrasada ou vencendo em breve
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {urgentFeed.map(action => (
              <Link key={action.id} to={`/acoes/${action.id}`}
                className="flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <StatusBadge status={action.status} />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{action.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {action.nextDueDate ? `Vence ${formatDate(action.nextDueDate)}` : '—'}
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mudanças abertas */}
      {openChanges.length > 0 && (
        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Mudanças urgentes em aberto
            </h2>
            <Link to="/mudancas" className="flex items-center gap-1 text-xs hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}>
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {openChanges.slice(0, 3).map(change => (
              <Link key={change.id} to={`/mudancas/${change.id}`}
                className="flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{
                      background: change.urgency === 'IMEDIATA' ? '#ef444422' : '#f59e0b22',
                      color: change.urgency === 'IMEDIATA' ? '#ef4444' : '#f59e0b',
                    }}>
                    {change.urgency}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{change.title}</span>
                </div>
                <StatusBadge status={change.status} type="change" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
