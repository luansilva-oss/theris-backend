import React, { useState, useEffect } from 'react';
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
    /** Contagem em cache (fallback); modal busca valor em tempo real ao abrir */
    userCount?: number;
    onDeleted: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    customConfirm: (config: { title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmLabel?: string }) => void;
}

import { API_URL } from '../config';

export const DeleteDepartmentModal: React.FC<Props> = ({ isOpen, onClose, department, allDepartments, userCount: initialUserCount = 0, onDeleted, showToast, customConfirm }) => {
    const [redirectToId, setRedirectToId] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [userCount, setUserCount] = useState(initialUserCount);
    const [loadingCount, setLoadingCount] = useState(false);

    // Busca contagem em tempo real ao abrir — evita cache stale após mover cargos
    useEffect(() => {
        if (!isOpen || !department?.id) return;
        setLoadingCount(true);
        fetch(`${API_URL}/api/structure/departments/${department.id}/user-count`)
            .then(r => r.ok ? r.json() : { count: 0 })
            .then(data => setUserCount(data.count ?? 0))
            .catch(() => setUserCount(initialUserCount))
            .finally(() => setLoadingCount(false));
    }, [isOpen, department?.id]);

    if (!isOpen || !department) return null;

    const otherDepartments = allDepartments.filter(d => d.id !== department.id);

    const handleDelete = async () => {
        if (userCount > 0 && !redirectToId) {
            return showToast("Selecione um departamento de destino para os usuários.", "warning");
        }

        customConfirm({
            title: "Excluir Departamento?",
            message: `Tem certeza que deseja excluir o departamento "${department.name}"? Esta ação é irreversível.`,
            isDestructive: true,
            confirmLabel: "Sim, Excluir",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await fetch(`${API_URL}/api/structure/departments/${department.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ redirectToDepartmentId: redirectToId || null })
                    });

                    if (res.ok) {
                        showToast("Departamento excluído com sucesso!", "success");
                        onDeleted();
                        onClose();
                    } else {
                        const data = await res.json();
                        showToast(data.error || "Erro ao excluir departamento.", "error");
                    }
                } catch (e) {
                    showToast("Erro de conexão.", "error");
                }
                setIsDeleting(false);
            }
        });
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

                    {loadingCount ? (
                        <p style={{ color: '#71717a', fontSize: 13, fontStyle: 'italic' }}>Verificando colaboradores vinculados...</p>
                    ) : userCount > 0 ? (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
                                ⚠️ Existem {userCount} colaborador(es) vinculado(s) a este departamento.
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
                            disabled={isDeleting || loadingCount || (userCount > 0 && !redirectToId)}
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
