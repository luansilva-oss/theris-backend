import { useState, useEffect } from 'react';
import { X, Save, Trash2, Search, Plus } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

interface User {
    id: string;
    name: string;
    email: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tool: any;
    levelName: string;
    onUpdate: () => void;
}

export const ManageLevelModal = ({ isOpen, onClose, tool, levelName, onUpdate }: Props) => {
    if (!isOpen) return null;

    const [name, setName] = useState(levelName);
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Filter users already in this level
    const usersInLevel = tool.accesses.filter((acc: any) => acc.status === levelName).map((acc: any) => acc.user);

    useEffect(() => {
        if (levelName) {
            setName(levelName);
            const descMap = tool.accessLevelDescriptions || {};
            setDescription(descMap[levelName] || '');
        }
        loadUsers();
    }, [levelName, tool]);

    const loadUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`);
            if (res.ok) setAllUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveInfo = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/level/${encodeURIComponent(levelName)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newLevelName: name,
                    description: description
                })
            });

            if (res.ok) {
                onUpdate();
                if (name !== levelName) onClose(); // Close if renamed to avoid confusion, or could just update state
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao salvar.");
            }
        } catch (e) {
            alert("Erro de conexão.");
        }
        setIsSaving(false);
    };

    const addUser = async (userId: string) => {
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level: levelName }) // Use current levelName (if renamed, ensure save first)
            });
            onUpdate();
            setSearchTerm('');
        } catch (e) {
            alert("Erro ao adicionar usuário.");
        }
    };

    const removeUser = async (userId: string) => {
        if (!confirm("Remover usuário deste nível?")) return;
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
            onUpdate();
        } catch (e) {
            alert("Erro ao remover usuário.");
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !usersInLevel.some((ul: any) => ul.id === u.id)
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Gerenciar Nível: {levelName}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* INFO SECTION */}
                    <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                        <h4 style={{ color: 'white', marginTop: 0 }}>Informações do Nível</h4>
                        <div className="form-group">
                            <label>Nome do Nível</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label>Descrição / Permissões</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="form-input"
                                style={{ width: '100%', minHeight: 60 }}
                                placeholder="O que este nível pode fazer?"
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button onClick={handleSaveInfo} disabled={isSaving} className="btn-verify" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>
                                {isSaving ? 'Salvando...' : 'Salvar Detalhes'}
                            </button>
                        </div>
                    </div>

                    {/* USERS SECTION */}
                    <div>
                        <h4 style={{ color: '#d4d4d8', marginBottom: 12 }}>Gerenciar Membros ({usersInLevel.length})</h4>

                        {/* ADD USER */}
                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#71717a' }} />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="form-input"
                                placeholder="Adicionar pessoa a este nível..."
                                style={{ width: '100%', paddingLeft: 34 }}
                            />
                            {searchTerm && (
                                <div style={{ position: 'absolute', top: 40, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 20, maxHeight: 150, overflowY: 'auto' }}>
                                    {filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => addUser(u.id)}
                                            style={{ padding: '10px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', color: '#e4e4e7', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                                            className="hover:bg-zinc-800"
                                        >
                                            <span>{u.name}</span>
                                            <Plus size={14} color="#a78bfa" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* LIST USERS */}
                        <div className="card-base" style={{ padding: 0, border: '1px solid #27272a', overflow: 'hidden' }}>
                            {usersInLevel.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
                                    Nenhum usuário neste nível.
                                </div>
                            ) : (
                                usersInLevel.map((u: User) => (
                                    <div key={u.id} style={{ padding: '12px 16px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#e4e4e7', fontSize: 13 }}>{u.name}</span>
                                        <button onClick={() => removeUser(u.id)} className="btn-icon" style={{ color: '#ef4444' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
