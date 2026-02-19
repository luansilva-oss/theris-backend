import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Briefcase, Building2, User as UserIcon, Search, ChevronDown, ChevronRight } from 'lucide-react';

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

interface User {
    id: string;
    name: string;
    email: string;
    department?: string;
    jobTitle?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    initialDepartment: string | null;
    allUsers: User[];
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    customConfirm: (config: { title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmLabel?: string }) => void;
}

export const ManageStructureModal: React.FC<Props> = ({ isOpen, onClose, onUpdate, initialDepartment, allUsers, showToast, customConfirm }) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Editing States
    const [viewMode, setViewMode] = useState<'GLOBAL' | 'DEPARTMENT'>('GLOBAL');
    const [currentDept, setCurrentDept] = useState<Department | null>(null);

    // Global: Create Dept
    const [newDeptName, setNewDeptName] = useState('');

    // Department View: Edit Name
    const [isEditingDeptName, setIsEditingDeptName] = useState(false);
    const [editedDeptName, setEditedDeptName] = useState('');

    // Department View: Roles
    const [newRoleName, setNewRoleName] = useState('');
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');

    // User Management Modal (inside)
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [targetRole, setTargetRole] = useState<Role | null>(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (initialDepartment) {
                // We'll set the mode after data loads
            } else {
                setViewMode('GLOBAL');
                setCurrentDept(null);
            }
        }
    }, [isOpen, initialDepartment]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
                setRoles(data.roles);

                if (initialDepartment) {
                    const dept = data.departments.find((d: Department) => d.name === initialDepartment);
                    if (dept) {
                        setCurrentDept(dept);
                        setViewMode('DEPARTMENT');
                        setEditedDeptName(dept.name);
                    }
                } else if (currentDept) {
                    const refreshed = data.departments.find((d: Department) => d.id === currentDept.id);
                    if (refreshed) setCurrentDept(refreshed);
                }
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    // --- ACTIONS ---

    const handleCreateDept = async () => {
        if (!newDeptName) return;
        try {
            const res = await fetch(`${API_URL}/api/structure/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName })
            });
            if (res.ok) {
                setNewDeptName('');
                loadData();
                onUpdate();
                showToast("Departamento criado!", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao criar departamento.", "error");
            }
        } catch (e) { showToast("Erro ao criar departamento.", "error"); }
    };

    const handleUpdateDeptName = async () => {
        if (!currentDept || !editedDeptName) return;
        try {
            const res = await fetch(`${API_URL}/api/structure/departments/${currentDept.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editedDeptName })
            });
            if (res.ok) {
                setIsEditingDeptName(false);
                loadData();
                onUpdate();
                showToast("Nome atualizado!", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao atualizar.", "error");
            }
        } catch (e) { showToast("Erro ao atualizar nome.", "error"); }
    };

    const handleDeleteDept = async (id: string) => {
        customConfirm({
            title: "Excluir Departamento?",
            message: "Excluir este departamento? Os cargos vinculados também serão removidos.",
            isDestructive: true,
            confirmLabel: "Sim, Excluir",
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/structure/departments/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        if (viewMode === 'DEPARTMENT') {
                            setViewMode('GLOBAL');
                            setCurrentDept(null);
                        }
                        loadData();
                        onUpdate();
                        showToast("Departamento excluído.", "success");
                    } else {
                        const err = await res.json();
                        showToast(err.error || "Erro ao excluir.", "error");
                    }
                } catch (e) { showToast("Erro ao excluir.", "error"); }
            }
        });
    };

    // --- ROLES ---

    const handleCreateRole = async () => {
        if (!newRoleName || !currentDept) return;
        try {
            const res = await fetch(`${API_URL}/api/structure/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, departmentId: currentDept.id })
            });
            if (res.ok) {
                setNewRoleName('');
                loadData();
                onUpdate();
                showToast("Cargo criado!", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao criar cargo.", "error");
            }
        } catch (e) { showToast("Erro ao criar cargo.", "error"); }
    };

    const handleUpdateRole = async (id: string) => {
        if (!currentDept) return;
        try {
            const res = await fetch(`${API_URL}/api/structure/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRoleName, departmentId: currentDept.id })
            });
            if (res.ok) {
                setEditingRoleId(null);
                loadData();
                onUpdate();
                showToast("Cargo atualizado!", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao atualizar cargo.", "error");
            }
        } catch (e) { showToast("Erro ao atualizar cargo.", "error"); }
    };

    const handleDeleteRole = async (id: string) => {
        customConfirm({
            title: "Excluir Cargo?",
            message: "Tem certeza que deseja excluir este cargo?",
            isDestructive: true,
            confirmLabel: "Excluir",
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/structure/roles/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        loadData();
                        onUpdate();
                        showToast("Cargo excluído!", "success");
                    } else {
                        const data = await res.json();
                        showToast(data.error || "Erro ao excluir.", "error");
                    }
                } catch (e) { showToast("Erro ao excluir.", "error"); }
            }
        });
    };

    // --- USER ASSIGNMENT ---

    const handleAddUserToRole = async (userId: string) => {
        if (!targetRole || !currentDept) return;
        try {
            const user = allUsers.find(u => u.id === userId);
            if (!user) return;

            const res = await fetch(`${API_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    systemProfile: (user as any).systemProfile || 'VIEWER',
                    jobTitle: targetRole.name,
                    department: currentDept.name
                })
            });

            if (res.ok) {
                setIsUserPickerOpen(false);
                onUpdate();
                showToast("Colaborador adicionado!", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao adicionar usuário.", "error");
            }
        } catch (e) { showToast("Erro ao adicionar usuário.", "error"); }
    };

    const handleRemoveUserFromRole = async (user: User) => {
        customConfirm({
            title: "Remover do Cargo?",
            message: `Remover ${user.name} deste cargo?`,
            confirmLabel: "Remover",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/users/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: user.name,
                            email: user.email,
                            systemProfile: (user as any).systemProfile || 'VIEWER',
                            jobTitle: '',
                            department: user.department
                        })
                    });
                    if (res.ok) {
                        onUpdate();
                        showToast("Colaborador removido do cargo.", "info");
                    } else {
                        const data = await res.json();
                        showToast(data.error || "Erro ao remover usuário.", "error");
                    }
                } catch (e) { showToast("Erro ao remover usuário.", "error"); }
            }
        });
    };

    const pickerUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) &&
        u.jobTitle !== targetRole?.name
    );

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}>

                {/* HEADER */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={24} color="#a78bfa" />
                        <h2 style={{ margin: 0 }}>
                            {viewMode === 'DEPARTMENT' && currentDept ? 'Gerenciar Departamento' : 'Estrutura Organizacional'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {viewMode === 'GLOBAL' ? (
                        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <h4 style={{ color: '#d4d4d8', marginTop: 0, marginBottom: 16 }}>Departamentos</h4>

                            {/* Create Dept */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexShrink: 0 }}>
                                <input
                                    className="form-input"
                                    placeholder="Novo Departamento..."
                                    value={newDeptName}
                                    onChange={e => setNewDeptName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn-verify" style={{ margin: 0, width: 'auto' }} onClick={handleCreateDept}><Plus size={16} /> Criar</button>
                            </div>

                            {/* Scrollable Department List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingRight: 8, flex: 1 }}>
                                {departments.map(d => (
                                    <div
                                        key={d.id}
                                        onClick={() => {
                                            setCurrentDept(d);
                                            setViewMode('DEPARTMENT');
                                            setEditedDeptName(d.name);
                                        }}
                                        className="card-base hover-card"
                                        style={{
                                            padding: '16px 20px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            border: '1px solid #27272a',
                                            position: 'relative',
                                            minHeight: '56px'
                                        }}
                                    >
                                        <span style={{ fontSize: 16, fontWeight: 500, color: 'white', textAlign: 'center' }}>{d.name}</span>
                                        <ChevronRight size={20} color="#52525b" style={{ position: 'absolute', right: 16 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // DEPARTMENT VIEW
                        currentDept && (
                            <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                                <button
                                    onClick={() => { setViewMode('GLOBAL'); setCurrentDept(null); }}
                                    style={{ background: 'transparent', border: 'none', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', width: 'fit-content' }}
                                >
                                    <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /> Voltar para Lista
                                </button>

                                {/* Title Editor */}
                                <div style={{ background: '#18181b', padding: 20, borderRadius: 8, border: '1px solid #27272a' }}>
                                    <div style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Nome do Departamento</div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        {isEditingDeptName ? (
                                            <>
                                                <input
                                                    className="form-input"
                                                    value={editedDeptName}
                                                    onChange={e => setEditedDeptName(e.target.value)}
                                                    style={{ flex: 1, fontSize: 18, fontWeight: 600 }}
                                                    autoFocus
                                                />
                                                <button className="btn-icon" onClick={handleUpdateDeptName}><Check size={20} color="#4ade80" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <h1 style={{ margin: 0, fontSize: 24, color: 'white' }}>{currentDept.name}</h1>
                                                <button className="btn-icon" onClick={() => setIsEditingDeptName(true)}><Edit2 size={16} color="#71717a" /></button>
                                            </>
                                        )}
                                        <div style={{ flex: 1 }} />
                                        <button className="btn-icon" onClick={() => handleDeleteDept(currentDept.id)} title="Excluir Departamento">
                                            <Trash2 size={18} color="#b91c1c" />
                                        </button>
                                    </div>
                                </div>

                                {/* Roles & Users */}
                                <div>
                                    <h3 style={{ color: '#e4e4e7', marginBottom: 15 }}>Cargos e Colaboradores</h3>

                                    {/* Add Role */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                        <input
                                            className="form-input"
                                            placeholder="Novo Cargo..."
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <button className="btn-mini" onClick={handleCreateRole} style={{ background: '#27272a', border: '1px solid #3f3f46' }}><Plus size={14} /> Adicionar Cargo</button>
                                    </div>

                                    {/* Scrollable Roles Container */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }}>
                                        {roles.filter(r => r.departmentId === currentDept.id).map(role => {
                                            const roleUsers = allUsers.filter(u => u.jobTitle === role.name && u.department === currentDept.name);

                                            return (
                                                <div key={role.id} style={{ border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                                    {/* Role Header */}
                                                    <div style={{ background: '#27272a', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        {editingRoleId === role.id ? (
                                                            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                                                <input
                                                                    className="form-input"
                                                                    value={editingRoleName}
                                                                    onChange={e => setEditingRoleName(e.target.value)}
                                                                    style={{ height: 30, fontSize: 13 }}
                                                                />
                                                                <button className="btn-icon" onClick={() => handleUpdateRole(role.id)}><Check size={14} color="#4ade80" /></button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <Briefcase size={14} color="#a1a1aa" />
                                                                <span style={{ fontWeight: 600, color: '#e4e4e7', fontSize: 14 }}>{role.name}</span>
                                                                <button className="btn-icon" onClick={() => { setEditingRoleId(role.id); setEditingRoleName(role.name); }}><Edit2 size={12} color="#52525b" /></button>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button
                                                                className="btn-mini"
                                                                onClick={() => {
                                                                    setTargetRole(role);
                                                                    setUserSearchTerm('');
                                                                    setIsUserPickerOpen(true);
                                                                }}
                                                                style={{ fontSize: 11, padding: '4px 8px', background: '#a78bfa', color: '#fff', border: 'none' }}
                                                            >
                                                                <Plus size={12} /> Add Pessoa
                                                            </button>
                                                            <button className="btn-icon" onClick={() => handleDeleteRole(role.id)}><Trash2 size={14} color="#71717a" /></button>
                                                        </div>
                                                    </div>

                                                    {/* Listed Users */}
                                                    <div style={{
                                                        background: '#18181b',
                                                        padding: '12px 16px',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: 8,
                                                        minHeight: '48px',
                                                        maxHeight: '200px',
                                                        overflowY: 'auto',
                                                        alignItems: 'flex-start', // Garante que itens não estiquem
                                                        alignContent: 'flex-start' // Garante que linhas fiquem no topo
                                                    }}>
                                                        {roleUsers.length === 0 ? (
                                                            <span style={{ fontSize: 12, color: '#52525b', fontStyle: 'italic' }}>Ninguém neste cargo ainda.</span>
                                                        ) : (
                                                            roleUsers.map(u => (
                                                                <div key={u.id} style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 6, // Trocado para inline-flex
                                                                    background: '#09090b', padding: '6px 12px', borderRadius: 20,
                                                                    border: '1px solid #27272a', fontSize: 12, color: '#d4d4d8',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <UserIcon size={10} color="#a1a1aa" />
                                                                    <span style={{ whiteSpace: 'nowrap' }}>{u.name}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveUserFromRole(u)}
                                                                        style={{
                                                                            background: 'transparent', border: 'none',
                                                                            cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 4
                                                                        }}
                                                                    >
                                                                        <X size={12} color="#ef4444" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* USER PICKER OVERLAY */}
                {isUserPickerOpen && targetRole && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ background: '#18181b', border: '1px solid #3f3f46', width: 400, borderRadius: 12, padding: 20, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: 16 }}>Adicionar a {targetRole.name}</h3>
                                <button onClick={() => setIsUserPickerOpen(false)} className="btn-icon"><X size={18} /></button>
                            </div>

                            <div style={{ position: 'relative', marginBottom: 15 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#71717a' }} />
                                <input
                                    className="form-input"
                                    placeholder="Buscar colaborador..."
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    style={{ width: '100%', paddingLeft: 30 }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {pickerUsers.slice(0, 10).map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleAddUserToRole(u.id)}
                                        style={{
                                            background: 'transparent', border: 'none', textAlign: 'left',
                                            padding: '8px 12px', color: '#e4e4e7', fontSize: 13, cursor: 'pointer',
                                            borderRadius: 6, display: 'flex', justifyContent: 'space-between'
                                        }}
                                        className="hover:bg-zinc-800"
                                    >
                                        <span>{u.name}</span>
                                        <span style={{ fontSize: 11, color: '#71717a' }}>{u.department || 'Sem Depto'}</span>
                                    </button>
                                ))}
                                {pickerUsers.length === 0 && <div style={{ textAlign: 'center', color: '#52525b', fontSize: 12, padding: 10 }}>Nenhum usuário encontrado.</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};