import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface Department {
    id: string;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    allDepartments: Department[];
    userCount: number;
    onDeleted: () => void;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

export const DeleteDepartmentModal: React.FC<Props> = ({ isOpen, onClose, department, allDepartments, userCount, onDeleted }) => {
    const [redirectToId, setRedirectToId] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !department) return null;

    const otherDepartments = allDepartments.filter(d => d.id !== department.id);

    const handleDelete = async () => {
        if (userCount > 0 && !redirectToId) {
            return alert("Por favor, selecione para qual departamento deseja mover os usuários.");
        }

        if (!confirm(`Tem certeza que deseja excluir o departamento "${department.name}"? Esta ação é irreversível.`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${department.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redirectToDepartmentId: redirectToId || null })
            });

            if (res.ok) {
                onDeleted();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao excluir departamento.");
            }
        } catch (e) {
            alert("Erro de conexão.");
        }
        setIsDeleting(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px', border: '1px solid #7f1d1d' }}>
                <div className="modal-header">
                    <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={24} /> Excluir Departamento
                    </h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p style={{ color: '#e4e4e7', fontSize: 14, lineHeight: 1.5 }}>
                        Você está prestes a excluir o departamento <strong>{department.name}</strong>.
                    </p>

                    {userCount > 0 ? (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
                                ⚠️ Existem {userCount} colaboradores vinculados a este departamento.
                                <br />Para onde deseja movê-los?
                            </p>

                            <select
                                value={redirectToId}
                                onChange={e => setRedirectToId(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', fontSize: 14, background: '#09090b' }}
                            >
                                <option value="">Selecionar destino...</option>
                                {otherDepartments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p style={{ color: '#71717a', fontSize: 13, fontStyle: 'italic' }}>
                            Este departamento não possui usuários vinculados. Os cargos vinculados também serão removidos.
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <button
                            onClick={onClose}
                            className="btn-mini"
                            style={{ flex: 1, height: '42px', background: 'transparent', border: '1px solid #27272a' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting || (userCount > 0 && !redirectToId)}
                            className="btn-verify"
                            style={{
                                flex: 2,
                                height: '42px',
                                background: '#ef4444',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                opacity: (userCount > 0 && !redirectToId) ? 0.5 : 1
                            }}
                        >
                            {isDeleting ? 'Excluindo...' : <><Trash2 size={18} /> Confirmar Exclusão</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
