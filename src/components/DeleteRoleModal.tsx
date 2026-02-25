import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { API_URL } from '../config';

interface Department {
    id: string;
    name: string;
    unitId?: string | null;
    roles?: { id: string; name: string }[];
}

interface Unit {
    id: string;
    name: string;
    departments: Department[];
}

interface Role {
    id: string;
    name: string;
    departmentId: string;
    department?: { name: string };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    role: Role | null;
    units: Unit[];
    userCountInRole: number;
    onDeleted: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DeleteRoleModal: React.FC<Props> = ({
    isOpen,
    onClose,
    role,
    units,
    userCountInRole,
    onDeleted,
    showToast
}) => {
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const departmentsForUnit = useMemo(() => {
        if (!selectedUnitId) return [];
        const u = units.find(x => x.id === selectedUnitId);
        return u?.departments ?? [];
    }, [units, selectedUnitId]);

    const rolesForDept = useMemo(() => {
        if (!selectedDeptId) return [];
        const d = departmentsForUnit.find(x => x.id === selectedDeptId);
        return (d?.roles ?? []).filter(r => r.id !== role?.id);
    }, [departmentsForUnit, selectedDeptId, role?.id]);

    const canConfirm = userCountInRole === 0 || (userCountInRole > 0 && !!selectedRoleId);

    if (!isOpen || !role) return null;

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
        setSelectedDeptId('');
        setSelectedRoleId('');
    };

    const handleDeptChange = (deptId: string) => {
        setSelectedDeptId(deptId);
        setSelectedRoleId('');
    };

    const handleDelete = async () => {
        if (userCountInRole > 0 && !selectedRoleId) {
            showToast('Selecione o novo cargo de destino para os colaboradores.', 'warning');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/structure/roles/${role.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fallbackRoleId: selectedRoleId || undefined })
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showToast('Cargo excluído com sucesso!', 'success');
                onDeleted();
                onClose();
            } else {
                showToast(data.error || 'Erro ao excluir cargo.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setIsDeleting(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: '480px', width: '95%', border: '1px solid #7f1d1d' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={24} /> Excluir cargo
                    </h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p style={{ color: '#e4e4e7', fontSize: 14, lineHeight: 1.5 }}>
                        Você está prestes a excluir o cargo <strong>{role.name}</strong>
                        {role.department?.name && <> do departamento {role.department.name}</>}.
                    </p>

                    {userCountInRole > 0 ? (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                            <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
                                ⚠️ Existem {userCountInRole} colaborador(es) neste cargo.
                                <br />Selecione o novo cargo de destino antes de excluir.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>1. Unidade</label>
                                    <select
                                        value={selectedUnitId}
                                        onChange={e => handleUnitChange(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%', fontSize: 14, background: '#09090b' }}
                                    >
                                        <option value="">Selecione a unidade...</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>2. Departamento</label>
                                    <select
                                        value={selectedDeptId}
                                        onChange={e => handleDeptChange(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%', fontSize: 14, background: '#09090b' }}
                                        disabled={!selectedUnitId}
                                    >
                                        <option value="">Selecione o departamento...</option>
                                        {departmentsForUnit.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>3. Novo cargo</label>
                                    <select
                                        value={selectedRoleId}
                                        onChange={e => setSelectedRoleId(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%', fontSize: 14, background: '#09090b' }}
                                        disabled={!selectedDeptId}
                                    >
                                        <option value="">Selecione o cargo...</option>
                                        {rolesForDept.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: '#71717a', fontSize: 13, fontStyle: 'italic' }}>
                            Este cargo não possui colaboradores vinculados. As ferramentas KBS do cargo também serão removidas.
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <button
                            onClick={onClose}
                            className="btn-mini"
                            style={{ flex: 1, height: '42px', background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting || !canConfirm}
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
                                opacity: canConfirm ? 1 : 0.5,
                                color: 'white'
                            }}
                        >
                            {isDeleting ? 'Excluindo...' : <><Trash2 size={18} /> Confirmar exclusão</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
