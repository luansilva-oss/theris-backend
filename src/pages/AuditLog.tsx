import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Search, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

interface AuditItem {
  id: string;
  tipo: string;
  entidadeTipo: string;
  entidadeId: string;
  descricao: string;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
  autorId?: string | null;
  autor?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

const TIPO_OPTIONS = ['Todos', 'ROLE_CREATED', 'ROLE_DELETED', 'ROLE_DEPARTMENT_CHANGE', 'USER_KBS_CHANGE', 'USER_STATUS_CHANGE'];
const ENTIDADE_OPTIONS = ['Role', 'User', 'Department', 'Unit'];

function getBadgeColor(tipo: string): string {
  if (tipo.startsWith('ROLE_')) return '#3b82f6';
  if (tipo.startsWith('USER_')) return '#8b5cf6';
  if (tipo.startsWith('DEPARTMENT_')) return '#eab308';
  if (tipo.startsWith('UNIT_')) return '#22c55e';
  return '#71717a';
}

function getEntityLabel(item: AuditItem): string {
  const name = (item.dadosDepois as any)?.name ?? (item.dadosAntes as any)?.name ?? item.entidadeId.slice(0, 8);
  return `${item.entidadeTipo} • ${name}`;
}

function formatJson(obj: unknown): string {
  if (obj == null) return '—';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface AuditLogProps {
  initialEntidadeId?: string;
  initialEntidadeTipo?: string;
}

export const AuditLog: React.FC<AuditLogProps> = ({ initialEntidadeId, initialEntidadeTipo }) => {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditItem | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const refDataInicio = useRef<HTMLInputElement>(null);
  const refDataFim = useRef<HTMLInputElement>(null);

  const [filtros, setFiltros] = useState({
    search: '',
    tipo: 'Todos',
    entidadeTipo: initialEntidadeTipo || '',
    dataInicio: '',
    dataFim: '',
    autorNome: '',
    entidadeId: initialEntidadeId || '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (filtros.entidadeId) params.set('entidadeId', filtros.entidadeId);
    if (filtros.entidadeTipo) params.set('entidadeTipo', filtros.entidadeTipo);
    if (filtros.tipo && filtros.tipo !== 'Todos') params.set('tipo', filtros.tipo);
    if (filtros.search.trim()) params.set('search', filtros.search.trim());
    if (filtros.dataInicio) params.set('dataInicio', new Date(filtros.dataInicio).toISOString());
    if (filtros.dataFim) params.set('dataFim', new Date(filtros.dataFim + 'T23:59:59').toISOString());
    if (filtros.autorNome.trim()) params.set('autorNome', filtros.autorNome.trim());

    try {
      const res = await fetch(`${API_URL}/api/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, filtros]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (initialEntidadeId) setFiltros(prev => ({ ...prev, entidadeId: initialEntidadeId }));
    if (initialEntidadeTipo) setFiltros(prev => ({ ...prev, entidadeTipo: initialEntidadeTipo }));
  }, [initialEntidadeId, initialEntidadeTipo]);

  const from = offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <h2 style={{ color: 'white', fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={24} /> Histórico de Mudanças
      </h2>

      {/* FILTROS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, background: '#18181b', padding: 16, borderRadius: 12, border: '1px solid #27272a' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input
            type="text"
            placeholder="Buscar na descrição..."
            className="form-input"
            style={{ paddingLeft: 36, width: '100%' }}
            value={filtros.search}
            onChange={e => setFiltros(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 180 }}
          value={filtros.tipo}
          onChange={e => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
        >
          {TIPO_OPTIONS.map(o => <option key={o} value={o}>{o === 'Todos' ? 'Tipo: Todos' : o}</option>)}
        </select>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 140 }}
          value={filtros.entidadeTipo}
          onChange={e => setFiltros(prev => ({ ...prev, entidadeTipo: e.target.value }))}
        >
          <option value="">Entidade: Todas</option>
          {ENTIDADE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div
          className="date-wrapper"
          onClick={() => refDataInicio.current?.showPicker?.()}
          style={{ cursor: 'pointer', width: 150 }}
        >
          <input
            ref={refDataInicio}
            type="date"
            className="form-input"
            style={{ pointerEvents: 'none', width: '100%' }}
            value={filtros.dataInicio}
            onChange={e => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
          />
        </div>
        <div
          className="date-wrapper"
          onClick={() => refDataFim.current?.showPicker?.()}
          style={{ cursor: 'pointer', width: 150 }}
        >
          <input
            ref={refDataFim}
            type="date"
            className="form-input"
            style={{ pointerEvents: 'none', width: '100%' }}
            value={filtros.dataFim}
            onChange={e => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
          />
        </div>
        <input
          type="text"
          placeholder="Nome do autor"
          className="form-input"
          style={{ width: 160 }}
          value={filtros.autorNome}
          onChange={e => setFiltros(prev => ({ ...prev, autorNome: e.target.value }))}
        />
        <button type="button" onClick={fetchData} className="btn-verify" style={{ padding: '8px 16px' }}>
          Filtrar
        </button>
      </div>

      {/* TABELA */}
      <div style={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
            <div style={{ height: 4, background: '#27272a', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ width: '30%', height: '100%', background: '#52525b', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            Carregando...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
            <FileText size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <div>Nenhum registro encontrado.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Data/Hora</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Tipo de Evento</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Entidade</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Descrição</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Autor</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  style={{
                    borderBottom: '1px solid #27272a',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#27272a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>{formatDate(row.createdAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${getBadgeColor(row.tipo)}22`,
                      color: getBadgeColor(row.tipo),
                    }}>
                      {row.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>{getEntityLabel(row)}</td>
                  <td style={{ padding: '12px 16px', color: '#a1a1aa', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.descricao}</td>
                  <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>{row.autor?.name || 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PAGINAÇÃO */}
        {total > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: '#71717a', fontSize: 12 }}>Exibindo {from}–{to} de {total} registros</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="form-input"
                style={{ padding: '6px 12px', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="form-input"
                style={{ padding: '6px 12px', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', opacity: offset + limit >= total ? 0.5 : 1 }}
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, animation: 'fadeIn 0.2s' }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(480px, 100%)',
            background: '#18181b',
            borderLeft: '1px solid #27272a',
            zIndex: 1000,
            overflowY: 'auto',
            animation: 'slideInRight 0.25s ease-out',
          }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: 18 }}>Detalhe do registro</h3>
                <button onClick={() => setSelected(null)} className="btn-icon" type="button"><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Data/Hora</div>
                  <div style={{ color: '#f4f4f5' }}>{formatDate(selected.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Tipo</div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: `${getBadgeColor(selected.tipo)}22`,
                    color: getBadgeColor(selected.tipo),
                  }}>{selected.tipo}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Entidade</div>
                  <div style={{ color: '#f4f4f5' }}>{getEntityLabel(selected)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Descrição</div>
                  <div style={{ color: '#f4f4f5' }}>{selected.descricao}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Autor</div>
                  <div style={{ color: '#f4f4f5' }}>{selected.autor?.name || 'Sistema'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }}>Antes</div>
                  <pre style={{
                    background: '#09090b',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#a1a1aa',
                    overflow: 'auto',
                    margin: 0,
                    border: '1px solid #27272a',
                  }}>{formatJson(selected.dadosAntes)}</pre>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>Depois</div>
                  <pre style={{
                    background: '#09090b',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#a1a1aa',
                    overflow: 'auto',
                    margin: 0,
                    border: '1px solid #27272a',
                  }}>{formatJson(selected.dadosDepois)}</pre>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
