import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Department {
    id: string;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    onUpdated: () => void;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

export const EditDepartmentModal: React.FC<Props> = ({ isOpen, onClose, department, onUpdated }) => {
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (department) {
            setName(department.name);
        }
    }, [department]);

    if (!isOpen || !department) return null;

    const handleSave = async () => {
        if (!name.trim()) return alert("Nome é obrigatório.");
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${department.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                onUpdated();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao atualizar departamento.");
            }
        } catch (e) {
            alert("Erro de conexão.");
        }
        setIsSaving(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Editar Departamento</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Nome do Departamento</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
                            autoFocus
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-verify"
                        style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
