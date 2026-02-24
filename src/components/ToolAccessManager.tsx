import React, { useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface User {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
    department?: string;
}

interface Tool {
    id: string;
    name: string;
    availableAccessLevels?: string[];
    accesses?: {
        id?: string;
        user: User;
        status: string;
    }[];
}

interface Props {
    tool: Tool | null;
    tools: Tool[];
    allUsers: User[];
    onSelectTool: (toolId: string) => void;
    onUpdate: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    customConfirm: (config: { title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmLabel?: string }) => void;
}

export const ToolAccessManager: React.FC<Props> = ({
    tool, tools, allUsers, onSelectTool, onUpdate, showToast, customConfirm
}) => {
    const [accessLevels, setAccessLevels] = useState<string[]>([]);
    const [newLevelInput, setNewLevelInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSavingLevels, setIsSavingLevels] = useState(false);

    React.useEffect(() => {
        if (tool) {
            setAccessLevels(tool.availableAccessLevels || ['Admin', 'User', 'Viewer']);
        }
    }, [tool?.id, tool?.availableAccessLevels]);

    if (!tool) {
        return (
            <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', padding: 24 }}>
                <h4 style={{ color: '#f4f4f5', margin: '0 0 12px 0' }}>Acessos & Pessoas</h4>
                <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>Selecione uma ferramenta para gerenciar níveis de acesso e usuários.</p>
                <select
                    value=""
                    onChange={e => onSelectTool(e.target.value)}
                    className="form-input"
                    style={{ marginTop: 12, maxWidth: 320 }}
                >
                    <option value="">— Selecione uma ferramenta —</option>
                    {tools.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
        );
    }

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const usersInTool = tool.accesses || [];
    const userIdsInTool = new Set(usersInTool.map(a => a.user.id));

    const saveLevels = async () => {
        setIsSavingLevels(true);
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availableAccessLevels: accessLevels })
            });
            if (res.ok) {
                showToast('Níveis de acesso salvos!', 'success');
                onUpdate();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro ao salvar.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setIsSavingLevels(false);
    };

    const addUser = async (userId: string, level: string) => {
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level })
            });
            if (res.ok) {
                showToast('Colaborador adicionado!', 'success');
                onUpdate();
                setSearchTerm('');
            } else {
                showToast('Erro ao adicionar.', 'error');
            }
        } catch (e) {
            showToast('Erro de conexão.', 'error');
        }
    };

    const updateUserLevel = (userId: string, level: string) => {
        addUser(userId, level);
    };

    const removeUser = (userId: string) => {
        customConfirm({
            title: 'Remover acesso?',
            message: 'Tem certeza que deseja remover este acesso à ferramenta?',
            isDestructive: true,
            confirmLabel: 'Remover',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('Acesso removido.', 'info');
                        onUpdate();
                    } else {
                        showToast('Erro ao remover.', 'error');
                    }
                } catch (e) {
                    showToast('Erro de conexão.', 'error');
                }
            }
        });
    };

    const addLevel = () => {
        const v = newLevelInput.trim();
        if (v && !accessLevels.includes(v)) {
            setAccessLevels([...accessLevels, v]);
            setNewLevelInput('');
        }
    };

    return (
        <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h4 style={{ color: '#f4f4f5', margin: 0 }}>Acessos & Pessoas — {tool.name}</h4>
                <select
                    value={tool.id}
                    onChange={e => onSelectTool(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: 280, fontSize: 13 }}
                >
                    {tools.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: 20 }}>
                <h5 style={{ color: '#e4e4e7', margin: '0 0 8px 0', fontSize: 13 }}>Níveis de Acesso Disponíveis</h5>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {accessLevels.map(lvl => (
                        <span key={lvl} style={{ background: '#3f3f46', padding: '4px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lvl}
                            <button
                                type="button"
                                onClick={() => setAccessLevels(accessLevels.filter(l => l !== lvl))}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={newLevelInput}
                        onChange={e => setNewLevelInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addLevel()}
                        placeholder="Novo nível (ex: Auditor)"
                        className="form-input"
                        style={{ flex: 1, fontSize: 13, height: 36 }}
                    />
                    <button type="button" onClick={addLevel} className="btn-mini">Adicionar e Salvar</button>
                </div>
                <button type="button" onClick={saveLevels} disabled={isSavingLevels} className="btn-verify" style={{ marginTop: 10, padding: '8px 16px', fontSize: 13 }}>
                    {isSavingLevels ? 'Salvando...' : 'Salvar Níveis e Alterações'}
                </button>
            </div>

            <div style={{ marginBottom: 12 }}>
                <h5 style={{ color: '#e4e4e7', margin: '0 0 8px 0', fontSize: 13 }}>Adicionar Usuário ao Sistema</h5>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#71717a' }} />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar pessoa..."
                        className="form-input"
                        style={{ width: '100%', paddingLeft: 30, fontSize: 14 }}
                    />
                    {searchTerm && (
                        <div style={{ position: 'absolute', top: 42, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                            {filteredUsers
                                .filter(u => !userIdsInTool.has(u.id))
                                .slice(0, 8)
                                .map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => addUser(u.id, accessLevels[0] || 'User')}
                                        style={{ padding: '8px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', fontSize: 13, color: '#d4d4d8' }}
                                    >
                                        {u.name}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ overflow: 'hidden', border: '1px solid #27272a', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#27272a', color: '#a1a1aa' }}>
                        <tr>
                            <th style={{ padding: 10, textAlign: 'left' }}>Usuário</th>
                            <th style={{ padding: 10, textAlign: 'left' }}>Nível Atual</th>
                            <th style={{ padding: 10, width: 44 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersInTool.map(acc => (
                            <tr key={acc.user.id} style={{ borderBottom: '1px solid #27272a', color: '#e4e4e7' }}>
                                <td style={{ padding: 10 }}>{acc.user.name}</td>
                                <td style={{ padding: 10 }}>
                                    <select
                                        value={acc.status}
                                        onChange={e => updateUserLevel(acc.user.id, e.target.value)}
                                        style={{ background: '#27272a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}
                                    >
                                        {accessLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button type="button" onClick={() => removeUser(acc.user.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
