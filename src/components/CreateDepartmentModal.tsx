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
    onCreated: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CreateDepartmentModal: React.FC<Props> = ({ isOpen, onClose, unit, onCreated, showToast }) => {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (unit) setName('');
    }, [unit]);

    if (!isOpen || !unit) return null;

    const handleCreate = async () => {
        if (!name.trim()) return showToast('Nome do departamento é obrigatório.', 'warning');
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/structure/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), unitId: unit.id })
            });
            if (res.ok) {
                showToast('Departamento criado!', 'success');
                onCreated();
                onClose();
            } else {
                const data = await res.json();
                showToast(data.error || 'Erro ao criar departamento.', 'error');
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
                    <h2>Adicionar Departamento</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>
                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <p style={{ color: '#a1a1aa', fontSize: 13 }}>Unidade: <strong style={{ color: '#e4e4e7' }}>{unit.name}</strong></p>
                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Nome do Departamento</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                            placeholder="Ex: Comercial, TI..."
                            autoFocus
                        />
                    </div>
                    <button onClick={handleCreate} disabled={isSaving} className="btn-verify" style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {isSaving ? 'Criando...' : <><Save size={18} /> Criar</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
