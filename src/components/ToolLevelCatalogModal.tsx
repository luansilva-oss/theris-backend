import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { API_URL } from '../config';

function suggestNextLevelCode(tool: {
  acronym?: string | null;
  accessLevels?: { code: string }[];
  availableAccessLevels?: string[];
}): string {
  const acronym = (tool.acronym || '').trim().toUpperCase();
  const codes: string[] = [
    ...(tool.accessLevels || []).map((a) => a.code),
    ...(tool.availableAccessLevels || []),
  ];
  let max = 0;
  if (acronym) {
    const re = new RegExp(`^${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i');
    for (const c of codes) {
      const m = String(c).match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${acronym}-${max + 1}`;
  }
  return '';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tool: {
    id: string;
    name: string;
    acronym?: string | null;
    accessLevels?: { id: string; code: string; name: string; description?: string | null }[];
    availableAccessLevels?: string[];
  };
  mode: 'create' | 'edit';
  editLevel?: { id: string; code: string; name: string; description?: string | null } | null;
  userId?: string;
  onSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ToolLevelCatalogModal({
  isOpen,
  onClose,
  tool,
  mode,
  editLevel,
  userId,
  onSaved,
  showToast,
}: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const placeholderCode = useMemo(() => {
    const ac = (tool.acronym || '').trim().toUpperCase();
    return ac ? `Ex: ${ac}-2` : 'Ex: SIGLA-2';
  }, [tool.acronym]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'create') {
      setCode(suggestNextLevelCode(tool));
      setName('');
      setLongDescription('');
    } else if (editLevel) {
      setCode(editLevel.code);
      setName(editLevel.name || '');
      setLongDescription(editLevel.description || '');
    }
  }, [isOpen, mode, editLevel?.id, tool.id]);

  if (!isOpen) return null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'create') {
        const res = await fetch(`${API_URL}/api/tools/${tool.id}/levels`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            description: longDescription.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast('Nível criado.', 'success');
          onSaved();
          onClose();
        } else {
          showToast(data.error || 'Erro ao criar nível.', 'error');
        }
      } else if (editLevel) {
        const res = await fetch(`${API_URL}/api/tools/${tool.id}/levels/${editLevel.id}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            description: longDescription.trim() || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast('Nível atualizado.', 'success');
          onSaved();
          onClose();
        } else {
          showToast(data.error || 'Erro ao atualizar nível.', 'error');
        }
      }
    } catch {
      showToast('Erro de conexão.', 'error');
    }
    setSaving(false);
  };

  const title = mode === 'create' ? 'Novo nível de acesso' : `Editar nível: ${editLevel?.code ?? ''}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480, width: '90%' }} onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, color: '#f4f4f5', fontSize: 18 }}>{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'create' && (
            <div className="form-group">
              <label style={{ fontSize: 12 }}>Código</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
                placeholder={placeholderCode}
                required
              />
            </div>
          )}
          {mode === 'edit' && editLevel && (
            <div className="form-group">
              <label style={{ fontSize: 12 }}>Código</label>
              <input value={editLevel.code} className="form-input" style={{ width: '100%', opacity: 0.7 }} readOnly />
            </div>
          )}
          <div className="form-group">
            <label style={{ fontSize: 12 }}>
              Nome / rótulo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              placeholder='Ex.: Acesso avançado'
              required
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: 12 }}>Descrição longa (opcional)</label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              className="form-input"
              style={{ width: '100%', minHeight: 88 }}
              placeholder="Detalhe o que este nível permite..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-text" style={{ color: '#a1a1aa' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-verify" style={{ padding: '10px 20px' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
