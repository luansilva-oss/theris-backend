import { useState, useEffect } from 'react';
import { X, Save, Trash2, Search, Plus, Shield, Crown, Zap, } from 'lucide-react'; // Added icons

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
    const [icon, setIcon] = useState('Shield');
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showAllUsers, setShowAllUsers] = useState(false);

    // Filter users already in this level
    const usersInLevel = tool.accesses.filter((acc: any) => acc.status === levelName).map((acc: any) => acc.user);

    useEffect(() => {
        if (levelName) {
            // Keep name in sync only on mounting/level change significantly
            setName(levelName);

            const descData = (tool.accessLevelDescriptions as any)?.[levelName];

            // Handle both string (legacy) and object format
            if (typeof descData === 'string') {
                setDescription(descData);
                setIcon(levelName.match(/admin|owner/i) ? 'Crown' : 'Shield');
            } else if (typeof descData === 'object' && descData !== null) {
                setDescription(descData.description || '');
                setIcon(descData.icon || (levelName.match(/admin|owner/i) ? 'Crown' : 'Shield'));
            } else {
                setDescription('');
                setIcon(levelName.match(/admin|owner/i) ? 'Crown' : 'Shield');
            }
        }
    }, [levelName]);

    const loadUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`);
            if (res.ok) setAllUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    // Load users once or when tool id changes
    useEffect(() => {
        loadUsers();
    }, [tool.id]);

    const handleSaveInfo = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/level/${encodeURIComponent(levelName)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newLevelName: name,
                    description: description,
                    icon: icon
                })
            });

            if (res.ok) {
                onUpdate();
                onClose(); // Always close on success
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
                body: JSON.stringify({ userId, level: levelName }) // Use current levelName
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

    // ... (rest of component state)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // ... (rest of methods)

    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleteConfirmOpen(false);
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/level/${encodeURIComponent(levelName)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                onUpdate();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao excluir nível.");
            }
        } catch (e) {
            alert("Erro ao excluir nível.");
        }
    };

    // ... (render)

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Custom Delete Confirmation Overlay */}
                {isDeleteConfirmOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8
                    }}>
                        <div style={{
                            background: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: 12,
                            padding: 24,
                            width: '90%',
                            maxWidth: 400,
                            textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{
                                width: 48, height: 48,
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '50%',
                                color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Trash2 size={24} />
                            </div>
                            <h3 style={{ color: '#f4f4f5', margin: '0 0 8px', fontSize: 18 }}>Excluir Nível?</h3>
                            <p style={{ color: '#a1a1aa', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
                                Tem certeza que deseja excluir o nível <strong>{levelName}</strong>? <br />
                                Isso removerá o acesso de todos os usuários vinculados a ele.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(false)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: '1px solid #3f3f46',
                                        color: '#e4e4e7',
                                        padding: '10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                    className="hover:bg-zinc-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    style={{
                                        flex: 1,
                                        background: '#ef4444',
                                        border: 'none',
                                        color: 'white',
                                        padding: '10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                    className="hover:bg-red-600"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

                        {/* ICON PICKER */}
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label>Ícone do Nível</label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                {['Shield', 'Crown'].map(ic => (
                                    <button
                                        key={ic}
                                        onClick={() => setIcon(ic)}
                                        style={{
                                            background: icon === ic ? '#3f3f46' : '#27272a',
                                            border: icon === ic ? '1px solid #a78bfa' : '1px solid #3f3f46',
                                            borderRadius: 6,
                                            padding: 8,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flex: 1
                                        }}
                                        className="hover:bg-zinc-800"
                                    >
                                        <span style={{ marginRight: 6 }}>
                                            {ic === 'Crown' ? <Crown size={16} color={icon === ic ? '#a78bfa' : '#71717a'} /> : <Shield size={16} color={icon === ic ? '#a78bfa' : '#71717a'} />}
                                        </span>
                                        <span style={{ fontSize: 13, color: icon === ic ? '#f4f4f5' : '#71717a', fontWeight: 500 }}>{ic === 'Crown' ? 'Coroa (Admin)' : 'Escudo (User)'}</span>
                                    </button>
                                ))}
                            </div>
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

                        {/* LIST USERS - CHIPS LAYOUT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {usersInLevel.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13, border: '1px solid #27272a', borderRadius: 8 }}>
                                    Nenhum usuário neste nível.
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {(showAllUsers ? usersInLevel : usersInLevel.slice(0, 5)).map((u: User) => (
                                            <div
                                                key={u.id}
                                                style={{
                                                    background: '#27272a',
                                                    border: '1px solid #3f3f46',
                                                    borderRadius: 20,
                                                    padding: '6px 12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    fontSize: 13,
                                                    color: '#e4e4e7'
                                                }}
                                            >
                                                <span>{u.name}</span>
                                                <button
                                                    onClick={() => removeUser(u.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#71717a',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        padding: 0
                                                    }}
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {usersInLevel.length > 5 && (
                                        <button
                                            onClick={() => setShowAllUsers(!showAllUsers)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#a78bfa',
                                                fontSize: 13,
                                                cursor: 'pointer',
                                                alignSelf: 'flex-start',
                                                marginTop: 4
                                            }}
                                        >
                                            {showAllUsers ? 'Mostrar menos' : `Mostrar mais (${usersInLevel.length - 5})`}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #27272a', padding: '16px 0 0 0', marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={handleDeleteClick}
                        className="btn-text"
                        style={{ color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                        <Trash2 size={14} /> Excluir Nível
                    </button>

                    <button onClick={handleSaveInfo} disabled={isSaving} className="btn-verify" style={{ width: 'auto', padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Save size={16} />
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};
