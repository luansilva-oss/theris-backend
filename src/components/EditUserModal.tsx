import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface User {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
    systemProfile: string;
    managerId?: string | null;
}

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
    user: User;
    onUpdate: () => void;
    currentUser: { id: string, systemProfile: string };
    allUsers: User[]; // Adicionado para selecionar gestor
}

export const EditUserModal: React.FC<Props> = ({ isOpen, onClose, user, onUpdate, currentUser, allUsers }) => {
    if (!isOpen) return null;

    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [jobTitle, setJobTitle] = useState(user.jobTitle);
    const [department, setDepartment] = useState(user.department);
    const [systemProfile, setSystemProfile] = useState(user.systemProfile || 'VIEWER');
    const [managerId, setManagerId] = useState<string | null>(user.managerId || null);
    const [isSaving, setIsSaving] = useState(false);

    const [availableDepts, setAvailableDepts] = useState<Department[]>([]);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

    useEffect(() => {
        setName(user.name);
        setEmail(user.email);
        setJobTitle(user.jobTitle);
        setDepartment(user.department);
        setSystemProfile(user.systemProfile || 'VIEWER');
        setManagerId(user.managerId || null);
        loadStructure();
    }, [user]);

    const loadStructure = async () => {
        try {
            const res = await fetch(`${API_URL}/api/structure`);
            if (res.ok) {
                const data = await res.json();
                setAvailableDepts(data.departments);
                setAvailableRoles(data.roles);
            }
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-requester-id': currentUser.id
                },
                body: JSON.stringify({ name, email, jobTitle, department, systemProfile, managerId })
            });

            if (res.ok) {
                onUpdate();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || "Erro ao salvar alterações.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de rede ao salvar.");
        }
        setIsSaving(false);
    };

    const isSuperAdmin = currentUser.systemProfile === 'SUPER_ADMIN';
    const isGestor = currentUser.systemProfile === 'GESTOR' || currentUser.systemProfile === 'ADMIN';

    // Opções de Perfil baseadas em quem está editando
    const profileOptions = [
        { value: 'VIEWER', label: 'Viewer (Apenas Visualização)' },
        { value: 'APPROVER', label: 'Aprovador (Aprova Tarefas/Ferramentas)' },
    ];

    if (isSuperAdmin) {
        profileOptions.push({ value: 'GESTOR', label: 'Gestor (Gerencia Pessoas)' });
        profileOptions.push({ value: 'SUPER_ADMIN', label: 'Super Admin (Acesso Total)' });
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Editar Colaborador</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div className="form-group">
                    <label>Nome Completo</label>
                    <input
                        className="form-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>E-mail</label>
                    <input
                        className="form-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label>Departamento</label>
                        <select
                            className="form-input"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }}
                        >
                            <option value="">Selecione...</option>
                            {availableDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Cargo</label>
                        <select
                            className="form-input"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }}
                        >
                            <option value="">Selecione...</option>
                            {availableRoles
                                .filter(r => !department || r.departmentId === availableDepts.find(d => d.name === department)?.id)
                                .map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                            }
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Perfil de Sistema (Acesso)</label>
                    <select
                        className="form-input"
                        value={systemProfile}
                        onChange={(e) => setSystemProfile(e.target.value)}
                    >
                        {profileOptions.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ background: '#18181b' }}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Gestor Imediato</label>
                    <select
                        className="form-input"
                        value={managerId || ''}
                        onChange={(e) => setManagerId(e.target.value || null)}
                        style={{ width: '100%', fontSize: 13 }}
                    >
                        <option value="">Sem Gestor (Root)</option>
                        {allUsers
                            .filter(u => u.id !== user.id) // Não pode ser gestor de si mesmo
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.jobTitle || 'Sem Cargo'})
                                </option>
                            ))
                        }
                    </select>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-verify"
                        style={{ margin: 0, flex: 1 }}
                        disabled={isSaving}
                        onClick={handleSave}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button
                        className="btn-verify"
                        style={{ margin: 0, background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
