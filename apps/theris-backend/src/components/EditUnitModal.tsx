import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { API_URL } from '../config';

interface Unit {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  onUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EditUnitModal: React.FC<Props> = ({ isOpen, onClose, unit, onUpdated, showToast }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (unit) setName(unit.name);
  }, [unit]);

  if (!isOpen || !unit) return null;

  const handleSave = async () => {
    if (!name.trim()) return showToast('Nome é obrigatório.', 'warning');
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/structure/units/${unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) {
        showToast('Unidade atualizada!', 'success');
        onUpdated();
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao atualizar unidade.', 'error');
      }
    } catch {
      showToast('Erro de conexão.', 'error');
    }
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Editar Unidade</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label style={{ fontSize: 12 }}>Nome da Unidade</label>
            <input value={name} onChange={e => setName(e.target.value)} className="form-input" style={{ width: '100%' }} autoFocus />
          </div>
          <button onClick={handleSave} disabled={isSaving} className="btn-verify" style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
};
