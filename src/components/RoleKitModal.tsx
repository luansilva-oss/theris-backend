import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

import { API_URL } from '../config';

export interface RoleKitItemType {
  id?: string;
  toolCode: string;
  toolName: string;
  accessLevelDesc?: string | null;
  criticality?: string | null;
  isCritical: boolean;
}

interface RoleWithKit {
  id: string;
  name: string;
  code?: string | null;
  department?: { name: string };
  kitItems: RoleKitItemType[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  roleName: string;
  departmentName: string;
  onUpdate: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RoleKitModal: React.FC<Props> = ({ isOpen, onClose, roleId, roleName, departmentName, onUpdate, showToast }) => {
  const [items, setItems] = useState<RoleKitItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && roleId) {
      setLoading(true);
      fetch(`${API_URL}/api/structure/roles/${roleId}/kit`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then((data: RoleWithKit) => {
          setItems((data.kitItems || []).map(k => ({
            toolCode: k.toolCode,
            toolName: k.toolName,
            accessLevelDesc: k.accessLevelDesc ?? '',
            criticality: k.criticality ?? '',
            isCritical: k.isCritical !== false
          })));
        })
        .catch(() => {
          setItems([]);
          showToast('Erro ao carregar kit do cargo.', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, roleId, showToast]);

  const addRow = () => {
    setItems(prev => [...prev, { toolCode: '', toolName: '', accessLevelDesc: '', criticality: '', isCritical: true }]);
  };

  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof RoleKitItemType, value: string | boolean) => {
    setItems(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSave = async () => {
    if (!roleId) return;
    setSaving(true);
    try {
      const payload = items
        .filter(it => (it.toolCode || '').trim() || (it.toolName || '').trim())
        .map(it => ({
          toolCode: (it.toolCode || '').trim() || '-',
          toolName: (it.toolName || '').trim() || '-',
          accessLevelDesc: (it.accessLevelDesc || '').trim() || undefined,
          criticality: (it.criticality || '').trim() || undefined,
          isCritical: it.isCritical !== false
        }));
      const res = await fetch(`${API_URL}/api/structure/roles/${roleId}/kit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      });
      if (res.ok) {
        showToast('Kit do cargo atualizado!', 'success');
        onUpdate();
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao salvar.', 'error');
      }
    } catch (e) {
      showToast('Erro de rede.', 'error');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 style={{ color: '#f4f4f5' }}>Kit Básico do Cargo — {roleName}</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div style={{ padding: '0 24px', fontSize: 12, color: '#71717a', marginBottom: 12 }}>{departmentName}</div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>Carregando...</div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button type="button" onClick={addRow} className="btn-mini" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> Adicionar ferramenta
                </button>
              </div>
              <div style={{ border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#18181b', color: '#a1a1aa' }}>
                      <th style={{ padding: 10, textAlign: 'left' }}>Código</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>Ferramenta</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>Nível de Acesso</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>Criticidade</th>
                      <th style={{ padding: 10, width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#52525b' }}>Nenhuma ferramenta no kit. Clique em &quot;Adicionar ferramenta&quot;.</td></tr>
                    )}
                    {items.map((row, index) => (
                      <tr key={index} style={{ borderTop: '1px solid #27272a' }}>
                        <td style={{ padding: 8 }}>
                          <input
                            className="form-input"
                            value={row.toolCode}
                            onChange={e => updateRow(index, 'toolCode', e.target.value)}
                            placeholder="Ex: ap_CK-1"
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            className="form-input"
                            value={row.toolName}
                            onChange={e => updateRow(index, 'toolName', e.target.value)}
                            placeholder="Ex: ClickUp"
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            className="form-input"
                            value={row.accessLevelDesc || ''}
                            onChange={e => updateRow(index, 'accessLevelDesc', e.target.value)}
                            placeholder="Descritivo oficial"
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            className="form-input"
                            value={row.criticality || ''}
                            onChange={e => updateRow(index, 'criticality', e.target.value)}
                            placeholder="Alta / Média / Baixa"
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <button type="button" onClick={() => removeRow(index)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #27272a', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" onClick={onClose} className="btn-verify" style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa' }}>Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn-verify">{saving ? 'Salvando...' : 'Salvar Kit'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
