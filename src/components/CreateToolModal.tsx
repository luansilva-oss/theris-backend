import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface ToolGroup {
    id: string;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateToolModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
    if (!isOpen) return null;

    const [name, setName] = useState('');
    const [acronym, setAcronym] = useState('');
    const [description, setDescription] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [subOwnerId, setSubOwnerId] = useState('');
    const [accessLevels, setAccessLevels] = useState<string[]>(['Admin', 'User', 'Viewer']);
    const [newLevel, setNewLevel] = useState('');
    const [groupId, setGroupId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [groups, setGroups] = useState<ToolGroup[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [newGroupMode, setNewGroupMode] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        fetch(`${API_URL}/api/tool-groups`)
            .then(res => res.json())
            .then(setGroups);

        fetch(`${API_URL}/api/users`)
            .then(res => res.json())
            .then(setUsers);
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return alert("Nome é obrigatório.");
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tools`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    acronym,
                    description,
                    ownerId: ownerId || null,
                    subOwnerId: subOwnerId || null,
                    availableAccessLevels: accessLevels,
                    toolGroupId: groupId
                })
            });
            if (res.ok) {
                onCreated();
                onClose();
            } else {
                alert("Erro ao criar.");
            }
        } catch (e) { alert("Erro de rede."); }
        setIsSaving(false);
    };

    const addAccessLevel = () => {
        if (newLevel.trim() && !accessLevels.includes(newLevel.trim())) {
            setAccessLevels([...accessLevels, newLevel.trim()]);
            setNewLevel('');
        }
    };

    const removeAccessLevel = (level: string) => {
        setAccessLevels(accessLevels.filter(l => l !== level));
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/tool-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            });
            const group = await res.json();
            setGroups([...groups, group]);
            setGroupId(group.id);
            setNewGroupMode(false);
            setNewGroupName('');
        } catch (e) { alert("Erro ao criar grupo."); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Nova Ferramenta</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15, maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Nome da Ferramenta</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: ClickUp, AWS, Figma"
                            className="form-input"
                            style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Acrônimo / Sigla (Opcional)</label>
                        <input
                            value={acronym}
                            onChange={e => setAcronym(e.target.value)}
                            placeholder="Ex: CU, AWS, FG"
                            className="form-input"
                            style={{ width: '100%', textAlign: 'left', fontSize: 14 }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Descrição</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="O que esta ferramenta faz?"
                            className="form-input"
                            style={{ width: '100%', textAlign: 'left', fontSize: 14, minHeight: 80, padding: 12 }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="form-group">
                            <label style={{ fontSize: 12 }}>Dono (Owner)</label>
                            <select
                                value={ownerId}
                                onChange={e => setOwnerId(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', fontSize: 13 }}
                            >
                                <option value="">Selecionar...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: 12 }}>Sub-Owner</label>
                            <select
                                value={subOwnerId}
                                onChange={e => setSubOwnerId(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', fontSize: 13 }}
                            >
                                <option value="">Selecionar...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Níveis de Acesso</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input
                                value={newLevel}
                                onChange={e => setNewLevel(e.target.value)}
                                placeholder="Novo nível (ex: Admin)"
                                className="form-input"
                                style={{ flex: 1, fontSize: 13 }}
                                onKeyPress={e => e.key === 'Enter' && addAccessLevel()}
                            />
                            <button onClick={addAccessLevel} className="btn-mini"><Plus size={14} /></button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {accessLevels.map(level => (
                                <span key={level} style={{ background: '#27272a', padding: '4px 10px', borderRadius: 15, fontSize: 11, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {level}
                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeAccessLevel(level)} />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: 12 }}>Grupo / Categoria</label>
                        {!newGroupMode ? (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <select
                                    value={groupId}
                                    onChange={e => setGroupId(e.target.value)}
                                    className="form-input"
                                    style={{ width: '100%', fontSize: 14 }}
                                >
                                    <option value="">Sem Grupo</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <button onClick={() => setNewGroupMode(true)} className="btn-mini" style={{ whiteSpace: 'nowrap' }}>
                                    <Plus size={14} /> Novo
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="Nome do grupo"
                                    className="form-input"
                                    style={{ width: '100%', fontSize: 14 }}
                                />
                                <button onClick={handleCreateGroup} className="btn-mini approve">Criar</button>
                                <button onClick={() => setNewGroupMode(false)} className="btn-mini reject">X</button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="btn-verify"
                        style={{ marginTop: 10, width: '100%' }}
                    >
                        {isSaving ? 'Criando...' : 'Cadastrar Ferramenta'}
                    </button>
                </div>
            </div>
        </div>
    );
};
