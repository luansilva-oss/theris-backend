import { useEffect, useState } from 'react';
import { getActions } from '../lib/api';
import type { Action } from '../lib/api';

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface ExecutionEntry {
  id: string;
  actionName: string;
  completedAt: string;
  completedByName?: string;
  notes: string | null;
  nextDueDate: string | null;
}

export function HistoricoPage() {
  const [entries, setEntries] = useState<ExecutionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getActions().then((actions: Action[]) => {
      const all: ExecutionEntry[] = [];
      for (const a of actions) {
        for (const ex of a.executions || []) {
          all.push({
            id: ex.id,
            actionName: a.name,
            completedAt: ex.completedAt,
            completedByName: ex.completedByName,
            notes: ex.notes,
            nextDueDate: ex.nextDueDate,
          });
        }
      }
      all.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setEntries(all);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e =>
    e.actionName.toLowerCase().includes(search.toLowerCase()) ||
    (e.completedByName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Histórico
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Todas as execuções registradas — cronologia auditável
        </p>
      </div>

      <input type="text" placeholder="Buscar no histórico..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="text-sm px-3 py-2 rounded-lg border outline-none"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)', width: 280 }} />

      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {entries.length === 0 ? 'Nenhuma execução registrada ainda.' : 'Nenhum resultado para a busca.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Ação', 'Executado por', 'Data', 'Próximo vencimento', 'Observações'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{e.actionName}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-text-muted)' }}>{e.completedByName || '—'}</td>
                  <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{formatDateTime(e.completedAt)}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--color-text-muted)' }}>
                    {e.nextDueDate ? new Date(e.nextDueDate).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-5 py-3 max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
