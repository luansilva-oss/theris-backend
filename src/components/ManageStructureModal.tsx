import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Briefcase, Building2 } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface Department {
    id: string;
    name: string;
}

interface Role {
    id: string;
    name: string;
    departmentId: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ManageStructureModal: React.FC<Props> = ({ isOpen, onClose, onUpdate }) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [editingDeptName, setEditingDeptName] = useState('');
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');

    const [newDeptName, setNewDeptName] = useState('');
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedDeptForRole, setSelectedDeptForRole] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
                setRoles(data.roles);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handleCreateDept = async () => {
        if (!newDeptName) return;
        try {
            await fetch(`${API_URL}/api/structure/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName })
            });
            setNewDeptName('');
            loadData();
            onUpdate();
        } catch (e) { alert("Erro ao criar departamento."); }
    };

    const handleUpdateDept = async (id: string) => {
        try {
            await fetch(`${API_URL}/api/structure/departments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingDeptName })
            });
            setEditingDeptId(null);
            loadData();
            onUpdate();
        } catch (e) { alert("Erro ao atualizar."); }
    };

    const handleDeleteDept = async (id: string) => {
        if (!confirm("Excluir este departamento? (Só possível se não houver cargos vinculados)")) return;
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadData();
                onUpdate();
            } else {
                const err = await res.json();
                alert(err.error || "Erro ao excluir.");
            }
        } catch (e) { alert("Erro ao excluir."); }
    };

    const handleCreateRole = async () => {
        if (!newRoleName || !selectedDeptForRole) return;
        try {
            await fetch(`${API_URL}/api/structure/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, departmentId: selectedDeptForRole })
            });
            setNewRoleName('');
            loadData();
            onUpdate();
        } catch (e) { alert("Erro ao criar cargo."); }
    };

    const handleUpdateRole = async (id: string, deptId: string) => {
        try {
            await fetch(`${API_URL}/api/structure/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRoleName, departmentId: deptId })
            });
            setEditingRoleId(null);
            loadData();
            onUpdate();
        } catch (e) { alert("Erro ao atualizar."); }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm("Excluir este cargo?")) return;
        try {
            await fetch(`${API_URL}/api/structure/roles/${id}`, { method: 'DELETE' });
            loadData();
            onUpdate();
        } catch (e) { alert("Erro ao excluir."); }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={20} color="#a78bfa" />
                        <h2 style={{ margin: 0 }}>Gerenciar Estrutura Organizacional</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, padding: '10px 0' }}>

                    {/* DEPARTAMENTOS */}
                    <div style={{ borderRight: '1px solid #27272a', paddingRight: 20 }}>
                        <h3 style={{ color: 'white', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Building2 size={16} /> Departamentos
                        </h3>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <input
                                className="form-input"
                                placeholder="Novo Departamento..."
                                style={{ flex: 1, fontSize: 13 }}
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                            />
                            <button className="btn-mini" onClick={handleCreateDept}><Plus size={14} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {departments.map(d => (
                                <div key={d.id} style={{ background: '#18181b', border: '1px solid #27272a', padding: '10px 15px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {editingDeptId === d.id ? (
                                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                            <input
                                                className="form-input"
                                                style={{ flex: 1, fontSize: 13, height: 30 }}
                                                value={editingDeptName}
                                                onChange={e => setEditingDeptName(e.target.value)}
                                                autoFocus
                                            />
                                            <button className="btn-icon" onClick={() => handleUpdateDept(d.id)}><Check size={16} color="#4ade80" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ color: '#e4e4e7', fontSize: 14 }}>{d.name}</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" onClick={() => { setEditingDeptId(d.id); setEditingDeptName(d.name); }}><Edit2 size={14} color="#71717a" /></button>
                                                <button className="btn-icon" onClick={() => handleDeleteDept(d.id)}><Trash2 size={14} color="#f87171" /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CARGOS */}
                    <div>
                        <h3 style={{ color: 'white', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Briefcase size={16} /> Cargos (Roles)
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, background: '#18181b', padding: 15, borderRadius: 8, border: '1px solid #27272a' }}>
                            <select
                                className="form-input"
                                style={{ width: '100%', fontSize: 13 }}
                                value={selectedDeptForRole}
                                onChange={e => setSelectedDeptForRole(e.target.value)}
                            >
                                <option value="">Vincular a Departamento...</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="form-input"
                                    placeholder="Nome do Cargo..."
                                    style={{ flex: 1, fontSize: 13 }}
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                />
                                <button className="btn-mini" onClick={handleCreateRole}><Plus size={14} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {roles.map(r => (
                                <div key={r.id} style={{ background: '#18181b', border: '1px solid #27272a', padding: '10px 15px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {editingRoleId === r.id ? (
                                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                            <input
                                                className="form-input"
                                                style={{ flex: 1, fontSize: 13, height: 30 }}
                                                value={editingRoleName}
                                                onChange={e => setEditingRoleName(e.target.value)}
                                                autoFocus
                                            />
                                            <button className="btn-icon" onClick={() => handleUpdateRole(r.id, r.departmentId)}><Check size={16} color="#4ade80" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div style={{ color: '#e4e4e7', fontSize: 14 }}>{r.name}</div>
                                                <div style={{ color: '#71717a', fontSize: 10, textTransform: 'uppercase' }}>{departments.find(d => d.id === r.departmentId)?.name}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" onClick={() => { setEditingRoleId(r.id); setEditingRoleName(r.name); }}><Edit2 size={14} color="#71717a" /></button>
                                                <button className="btn-icon" onClick={() => handleDeleteRole(r.id)}><Trash2 size={14} color="#f87171" /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 20, borderTop: '1px solid #27272a', paddingTop: 20 }}>
                    <button className="btn-verify" style={{ width: '100%', margin: 0 }} onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};
