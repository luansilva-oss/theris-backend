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
    const [groupId, setGroupId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [groups, setGroups] = useState<ToolGroup[]>([]);
    const [newGroupMode, setNewGroupMode] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        fetch(`${API_URL}/api/tool-groups`)
            .then(res => res.json())
            .then(setGroups);
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return alert("Nome é obrigatório.");
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tools`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, acronym, toolGroupId: groupId })
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

                <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-group">
                        <label>Nome da Ferramenta</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: ClickUp, AWS, Figma"
                            className="mfa-input-single"
                            style={{ width: '100%', textAlign: 'left' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Acrônimo / Sigla (Opcional)</label>
                        <input
                            value={acronym}
                            onChange={e => setAcronym(e.target.value)}
                            placeholder="Ex: CU, AWS, FG"
                            className="mfa-input-single"
                            style={{ width: '100%', textAlign: 'left' }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Grupo / Categoria</label>
                        {!newGroupMode ? (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <select
                                    value={groupId}
                                    onChange={e => setGroupId(e.target.value)}
                                    className="mfa-input-single"
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
                                    className="mfa-input-single"
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
                        style={{ marginTop: 10 }}
                    >
                        {isSaving ? 'Criando...' : 'Cadastrar Ferramenta'}
                    </button>
                </div>
            </div>
        </div>
    );
};
