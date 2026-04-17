import { useEffect, useState } from 'react';
import { getLogs } from '../lib/api';
import type { LogEntry } from '../lib/api';

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const kindLabel: Record<LogEntry['kind'], string> = {
  cron: 'Slack / Cron',
  execution: 'Conclusão',
};

const kindColor: Record<LogEntry['kind'], string> = {
  cron: '#8b5cf6',
  execution: '#22c55e',
};

export function HistoricoPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'cron' | 'execution'>('');

  useEffect(() => {
    getLogs().then(setEntries).finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    const matchesSearch = e.label.toLowerCase().includes(search.toLowerCase()) ||
      e.detail.toLowerCase().includes(search.toLowerCase());
    const matchesKind = !kindFilter || e.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Histórico
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Todas as execuções, disparos Slack e eventos do SGSI — cronologia auditável
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Buscar no histórico..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
            width: 280,
          }} />
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value as '' | 'cron' | 'execution')}
          className="text-sm px-3 py-2 rounded-lg border outline-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}>
          <option value="">Todos os tipos</option>
          <option value="execution">Conclusões de ações</option>
          <option value="cron">Disparos Slack / Cron</option>
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {entries.length === 0 ? 'Nenhum evento registrado ainda.' : 'Nenhum resultado para a busca.'}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filtered.map(entry => (
              <div key={entry.id} className="px-5 py-3 flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: `${kindColor[entry.kind]}22`,
                      color: kindColor[entry.kind],
                    }}>
                    {kindLabel[entry.kind]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{
                    color: entry.success ? 'var(--color-text)' : '#ef4444',
                  }}>
                    {entry.label}
                  </div>
                  {entry.detail && (
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {entry.detail}
                    </div>
                  )}
                </div>
                <div className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
