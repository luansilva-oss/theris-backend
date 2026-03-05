import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import { API_URL } from '../config';

const CATEGORY_OPTIONS = [
  { value: 'GESTAO_PESSOAS', label: 'Gestão de Pessoas' },
  { value: 'GESTAO_ACESSOS', label: 'Gestão de Acessos' },
  { value: 'TI_INFRA', label: 'TI / Infra' },
];

const COLUMN_OPTIONS = [
  { key: 'id', label: 'ID do chamado' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'assunto', label: 'Assunto / Tipo' },
  { key: 'status', label: 'Status' },
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'data', label: 'Data e Hora' },
  { key: 'justificativa', label: 'Justificativa' },
  { key: 'detalhes', label: 'Detalhes (Slack)' },
  { key: 'observacao', label: 'Observação' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
}

export const ReportExportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, currentUserId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<Record<string, boolean>>({
    GESTAO_PESSOAS: true,
    GESTAO_ACESSOS: true,
    TI_INFRA: true,
  });
  const [columns, setColumns] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(c => { o[c.key] = true; });
    return o;
  });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setError('');
    if (!startDate || !endDate) {
      setError('Preencha o período (De e Até).');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('A data "De" deve ser anterior à data "Até".');
      return;
    }
    const cats = Object.entries(categories).filter(([, v]) => v).map(([k]) => k);
    if (cats.length === 0) cats.push('GESTAO_PESSOAS', 'GESTAO_ACESSOS', 'TI_INFRA');
    const cols = Object.entries(columns).filter(([, v]) => v).map(([k]) => k);
    if (cols.length === 0) cols.push('id', 'categoria', 'assunto');

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('startDate', new Date(startDate).toISOString());
      params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
      cats.forEach(c => params.append('categories', c));
      cols.forEach(c => params.append('columns', c));
      const headers: HeadersInit = { 'x-user-id': currentUserId };
      const res = await fetch(`${API_URL}/api/requests/export/csv?${params}`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao exportar.');
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'relatorio.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao exportar.');
    } finally {
      setExporting(false);
    }
  };

  const toggleAllCategories = (checked: boolean) => {
    setCategories({ GESTAO_PESSOAS: checked, GESTAO_ACESSOS: checked, TI_INFRA: checked });
  };
  const allCategoriesChecked = categories.GESTAO_PESSOAS && categories.GESTAO_ACESSOS && categories.TI_INFRA;
  const toggleAllColumns = (checked: boolean) => {
    const o: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(c => { o[c.key] = checked; });
    setColumns(o);
  };
  const allColumnsChecked = COLUMN_OPTIONS.every(c => columns[c.key]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={22} /> Exportar Relatório CSV
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.15)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }}>Período *</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>De</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </label>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Até</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }}>Categoria</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={allCategoriesChecked} onChange={e => toggleAllCategories(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Todos</span>
            </label>
            {CATEGORY_OPTIONS.map(c => (
              <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }}>
                <input type="checkbox" checked={categories[c.value] !== false} onChange={e => setCategories(prev => ({ ...prev, [c.value]: e.target.checked }))} />
                <span style={{ fontSize: 13 }}>{c.label}</span>
              </label>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }}>Colunas a incluir</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={allColumnsChecked} onChange={e => toggleAllColumns(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Todas</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COLUMN_OPTIONS.map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={columns[c.key] !== false} onChange={e => setColumns(prev => ({ ...prev, [c.key]: e.target.checked }))} />
                  <span style={{ fontSize: 13 }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn-verify" style={{ flex: 1 }} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button className="btn-verify" style={{ background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }} onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
