import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

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
    description?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool;
    onUpdate: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EditToolModal: React.FC<Props> = ({ isOpen, onClose, tool, onUpdate, showToast }) => {
    if (!isOpen) return null;

    // Form Data (apenas Identidade & Grupo - Acessos ficam em Gestão de Pessoas)
    const [name, setName] = useState(tool.name);
    const [acronym, setAcronym] = useState(tool.acronym || '');
    const [groupId, setGroupId] = useState(tool.toolGroupId || '');
    const [ownerId, setOwnerId] = useState(tool.owner?.id || '');
    const [subOwnerId, setSubOwnerId] = useState(tool.subOwner?.id || '');
    const [description, setDescription] = useState(tool.description || '');

    // Data Lists
    const [availableGroups, setAvailableGroups] = useState<ToolGroup[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    acronym,
                    toolGroupId: groupId || null,
                    ownerId: ownerId || null,
                    subOwnerId: subOwnerId || null,
                    description
                })
            });

            if (res.ok) {
                showToast("Informações atualizadas com sucesso!", "success");
                onUpdate();
                onClose();
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao salvar.", "error");
            }
        } catch (e) {
            showToast("Erro ao salvar.", "error");
        }
        setIsSaving(false);
    };

    const createGroup = async () => {
        if (!newGroupName) return;
        try {
            const res = await fetch(`${API_URL}/api/tool-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            });
            if (res.ok) {
                const group = await res.json();
                setAvailableGroups([...availableGroups, group]);
                setGroupId(group.id);
                setNewGroupMode(false);
                setNewGroupName('');
                showToast("Grupo criado!", "success");
            } else {
                showToast("Erro ao criar grupo.", "error");
            }
        } catch (e) { showToast("Erro ao criar grupo.", "error"); }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', display: 'flex', flexDirection: 'column' }}>

                <div className="modal-header">
                    <h2>Editar {tool.name}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label>Nome do Sistema</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="form-input" style={{ width: '100%', textAlign: 'left', fontSize: 14 }} />
                            </div>

                            <div className="form-group">
                                <label>Sigla / Acrônimo</label>
                                <input value={acronym} onChange={e => setAcronym(e.target.value)} className="form-input" style={{ width: '100%', textAlign: 'left', fontSize: 14 }} placeholder="Ex: AWS" />
                            </div>

                            <div className="form-group">
                                <label>Grupo / Categoria</label>
                                {!newGroupMode ? (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <select value={groupId} onChange={e => setGroupId(e.target.value)} className="form-input" style={{ width: '100%', fontSize: 14 }}>
                                            <option value="">Sem Grupo</option>
                                            {availableGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <button onClick={() => setNewGroupMode(true)} className="btn-mini" style={{ whiteSpace: 'nowrap' }}><Plus size={14} /> Novo Grupo</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nome do novo grupo" className="form-input" style={{ width: '100%', fontSize: 14 }} />
                                        <button onClick={createGroup} className="btn-mini approve">Criar</button>
                                        <button onClick={() => setNewGroupMode(false)} className="btn-mini reject">Cancelar</button>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Owner (Dono do Produto)</label>
                                <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="form-input" style={{ width: '100%', fontSize: 14 }}>
                                    <option value="">Selecione...</option>
                                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Sub-Owner (Técnico / Backup)</label>
                                <select value={subOwnerId} onChange={e => setSubOwnerId(e.target.value)} className="form-input" style={{ width: '100%', fontSize: 14 }}>
                                    <option value="">Selecione...</option>
                                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Descrição do Sistema</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="form-input"
                                    style={{ width: '100%', textAlign: 'left', fontSize: 14, minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Descreva a finalidade desta ferramenta..."
                                />
                            </div>

                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #27272a' }}>
                                <button onClick={handleSave} disabled={isSaving} className="btn-verify" style={{ width: 'auto', padding: '10px 30px' }}>
                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
