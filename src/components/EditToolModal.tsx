import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Search, Users, Shield, Box } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface User {
    id: string;
    name: string;
    email: string;
    department?: string;
    jobTitle?: string;
}

interface ToolGroup {
    id: string;
    name: string;
}

interface Tool {
    id: string;
    name: string;
    acronym?: string;
    owner?: User;
    subOwner?: User;
    toolGroupId?: string;
    toolGroup?: ToolGroup;
    availableAccessLevels?: string[];
    accesses: { user: User; status: string }[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool;
    onUpdate: () => void; // Recarregar dados pai
}

export const EditToolModal: React.FC<Props> = ({ isOpen, onClose, tool, onUpdate }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ACCESS'>('IDENTITY');

    // Form Data
    const [name, setName] = useState(tool.name);
    const [acronym, setAcronym] = useState(tool.acronym || '');
    const [groupId, setGroupId] = useState(tool.toolGroupId || '');
    const [ownerId, setOwnerId] = useState(tool.owner?.id || '');
    const [subOwnerId, setSubOwnerId] = useState(tool.subOwner?.id || '');
    const [accessLevels, setAccessLevels] = useState<string[]>(tool.availableAccessLevels || ["Admin", "User", "Viewer"]);

    // Data Lists
    const [availableGroups, setAvailableGroups] = useState<ToolGroup[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // UI States
    const [isSaving, setIsSaving] = useState(false);
    const [newGroupMode, setNewGroupMode] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        loadAuxData();
    }, []);

    const loadAuxData = async () => {
        try {
            const [resGroups, resUsers] = await Promise.all([
                fetch(`${API_URL}/api/tool-groups`),
                fetch(`${API_URL}/api/users`)
            ]);
            if (resGroups.ok) setAvailableGroups(await resGroups.json());
            if (resUsers.ok) setAllUsers(await resUsers.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveIdentity = async () => {
        setIsSaving(true);
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    acronym,
                    toolGroupId: groupId,
                    ownerId: ownerId || null,
                    subOwnerId: subOwnerId || null,
                    availableAccessLevels: accessLevels // Envia níveis também, caso tenha editado
                })
            });
            onUpdate();
            onClose();
        } catch (e) {
            alert("Erro ao salvar.");
        }
        setIsSaving(false);
    };

    const notifyUserChange = async (userId: string, level: string) => {
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level })
            });
            onUpdate();
        } catch (e) {
            alert("Erro ao atualizar acesso.");
        }
    };

    const removeUser = async (userId: string) => {
        if (!confirm("Remover acesso?")) return;
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
            onUpdate(); // O pai atualizará a prop 'tool', que atualizará a UI? 
            // OBS: como 'tool' vem via props, a lista de usuários aqui na modal só atualiza se o pai atualizar e repassar.
            // Idealmente, a modal devia ter um state local de users ou chamar onUpdate e esperar.
        } catch (e) {
            alert("Erro.");
        }
    }

    const createGroup = async () => {
        if (!newGroupName) return;
        try {
            const res = await fetch(`${API_URL}/api/tool-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            });
            const group = await res.json();
            setAvailableGroups([...availableGroups, group]);
            setGroupId(group.id);
            setNewGroupMode(false);
            setNewGroupName('');
        } catch (e) { alert("Erro ao criar grupo."); }
    }

    // Filter users for selection inputs
    const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="modal-header">
                    <h2>Editar {tool.name}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #27272a', marginBottom: 20 }}>
                    <button
                        onClick={() => setActiveTab('IDENTITY')}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'IDENTITY' ? '2px solid #8b5cf6' : 'none',
                            color: activeTab === 'IDENTITY' ? 'white' : '#71717a',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Identidade & Grupo
                    </button>
                    <button
                        onClick={() => setActiveTab('ACCESS')}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'ACCESS' ? '2px solid #8b5cf6' : 'none',
                            color: activeTab === 'ACCESS' ? 'white' : '#71717a',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Acessos & Pessoas
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>

                    {activeTab === 'IDENTITY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label>Nome do Sistema</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="mfa-input-single" style={{ width: '100%', textAlign: 'left', fontSize: 14 }} />
                            </div>

                            <div className="form-group">
                                <label>Sigla / Acrônimo</label>
                                <input value={acronym} onChange={e => setAcronym(e.target.value)} className="mfa-input-single" style={{ width: '100%', textAlign: 'left', fontSize: 14 }} placeholder="Ex: AWS" />
                            </div>

                            <div className="form-group">
                                <label>Grupo / Categoria</label>
                                {!newGroupMode ? (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <select value={groupId} onChange={e => setGroupId(e.target.value)} className="mfa-input-single" style={{ width: '100%', fontSize: 14 }}>
                                            <option value="">Sem Grupo</option>
                                            {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <button onClick={() => setNewGroupMode(true)} className="btn-mini" style={{ whiteSpace: 'nowrap' }}><Plus size={14} /> Novo Grupo</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nome do novo grupo" className="mfa-input-single" style={{ width: '100%', fontSize: 14 }} />
                                        <button onClick={createGroup} className="btn-mini approve">Criar</button>
                                        <button onClick={() => setNewGroupMode(false)} className="btn-mini reject">Cancelar</button>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Owner (Dono do Produto)</label>
                                <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="mfa-input-single" style={{ width: '100%', fontSize: 14 }}>
                                    <option value="">Selecione...</option>
                                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Sub-Owner (Técnico / Backup)</label>
                                <select value={subOwnerId} onChange={e => setSubOwnerId(e.target.value)} className="mfa-input-single" style={{ width: '100%', fontSize: 14 }}>
                                    <option value="">Selecione...</option>
                                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #27272a' }}>
                                <button onClick={handleSaveIdentity} disabled={isSaving} className="btn-verify" style={{ width: 'auto', padding: '10px 30px' }}>
                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ACCESS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Níveis de Acesso */}
                            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                                <h4 style={{ color: 'white', margin: '0 0 10px 0' }}>Níveis de Acesso Disponíveis</h4>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                    {accessLevels.map(lvl => (
                                        <span key={lvl} style={{ background: '#3f3f46', padding: '4px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {lvl}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input
                                        id="newLevelInput"
                                        placeholder="Novo nível (ex: Auditor)"
                                        className="mfa-input-single"
                                        style={{ flex: 1, fontSize: 13, height: 36 }}
                                    />
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById('newLevelInput') as HTMLInputElement;
                                            if (el.value && !accessLevels.includes(el.value)) {
                                                setAccessLevels([...accessLevels, el.value]);
                                                el.value = '';
                                            }
                                        }}
                                        className="btn-mini"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            {/* Adicionar Usuário */}
                            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                                <h4 style={{ color: 'white', margin: '0 0 10px 0' }}>Adicionar Usuário ao Sistema</h4>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#71717a' }} />
                                        <input
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Buscar pessoa..."
                                            className="mfa-input-single"
                                            style={{ width: '100%', paddingLeft: 30, fontSize: 14 }}
                                        />
                                        {searchTerm && (
                                            <div style={{ position: 'absolute', top: 45, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                                                {filteredUsers.slice(0, 5).map(u => (
                                                    <div
                                                        key={u.id + "_search"}
                                                        onClick={() => {
                                                            // Adicionar direto default 'User'
                                                            notifyUserChange(u.id, accessLevels[1] || 'User'); // Pega o segundo nível ou User
                                                            setSearchTerm('');
                                                        }}
                                                        style={{ padding: '8px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', fontSize: 13, color: '#d4d4d8' }}
                                                        className="hover:bg-zinc-800"
                                                    >
                                                        {u.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Usuários */}
                            <div className="card-base" style={{ padding: 0, border: '1px solid #27272a', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead style={{ background: '#18181b', color: '#a1a1aa' }}>
                                        <tr>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Usuário</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>Nível Atual</th>
                                            <th style={{ padding: 12, width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tool.accesses && tool.accesses.map(acc => (
                                            <tr key={acc.user.id} style={{ borderBottom: '1px solid #27272a', color: '#e4e4e7' }}>
                                                <td style={{ padding: 12 }}>{acc.user.name}</td>
                                                <td style={{ padding: 12 }}>
                                                    <select
                                                        value={acc.status}
                                                        onChange={(e) => notifyUserChange(acc.user.id, e.target.value)}
                                                        style={{ background: '#27272a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }}
                                                    >
                                                        {accessLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    <button onClick={() => removeUser(acc.user.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
