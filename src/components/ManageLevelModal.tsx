import { useState, useEffect } from 'react';
import { X, Save, Trash2, Search, Plus, Shield, Crown, Zap, } from 'lucide-react'; // Added icons

import { API_URL } from '../config';

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
    /** Nível persistido em ToolAccessLevel (edição de nome/descrição pelo modal do catálogo / lápis). */
    catalogLevelId?: string | null;
    onUpdate: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    customConfirm: (config: { title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmLabel?: string }) => void;
}

export const ManageLevelModal = ({ isOpen, onClose, tool, levelName, catalogLevelId, onUpdate, showToast, customConfirm }: Props) => {
    if (!isOpen) return null;

    const [name, setName] = useState(levelName);
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('Shield');
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showAllUsers, setShowAllUsers] = useState(false);

    // Filter users already in this level (catálogo)
    const usersInLevel = tool.accesses.filter((acc: any) => acc.status === levelName).map((acc: any) => acc.user);
    // Usuários que recebem este nível via KBS (Gestão de Pessoas)
    const kbsMembersByLevel = (tool as any).kbsMembersByLevel as { level: string; users: { id: string; name: string; email: string }[] }[] | undefined;
    const kbsUsersForLevel = (kbsMembersByLevel || []).find(
        (k) => (k.level || '').trim().toLowerCase() === (levelName || '').trim().toLowerCase()
    )?.users ?? [];

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
                credentials: 'include',
                body: JSON.stringify({
                    newLevelName: name.trim(),
                    description: description,
                    icon: icon
                })
            });

            if (res.ok) {
                showToast("Informações do nível salvas!", "success");
                onUpdate();
                onClose(); // Always close on success
            } else {
                const data = await res.json();
                showToast(data.error || "Erro ao salvar.", "error");
            }
        } catch (e) {
            showToast("Erro de conexão.", "error");
        }
        setIsSaving(false);
    };


    const addUser = async (userId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level: levelName })
            });

            if (res.ok) {
                onUpdate();
                setSearchTerm('');
                showToast("Colaborador sincronizado!", "success");
            } else {
                showToast("Erro ao adicionar usuário.", "error");
            }
        } catch (e) {
            showToast("Erro ao adicionar usuário.", "error");
        }
    };

    const removeUser = async (userId: string) => {
        customConfirm({
            title: "Remover Acesso?",
            message: "Tem certeza que deseja remover este usuário deste nível de acesso?",
            isDestructive: true,
            confirmLabel: "Remover",
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
                    if (res.ok) {
                        onUpdate();
                        showToast("Acesso removido.", "info");
                    } else {
                        showToast("Erro ao remover usuário.", "error");
                    }
                } catch (e) {
                    showToast("Erro ao remover usuário.", "error");
                }
            }
        });
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
            const url = catalogLevelId
                ? `${API_URL}/api/tools/${tool.id}/levels/${catalogLevelId}`
                : `${API_URL}/api/tools/${tool.id}/level/${encodeURIComponent(levelName)}`;
            const res = await fetch(url, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (res.ok) {
                showToast("Nível de acesso removido.", "success");
                onUpdate();
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || "Erro ao excluir nível.", "error");
            }
        } catch (e) {
            showToast("Erro ao excluir nível.", "error");
        }
    };

    // ... (render)

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '85vh', height: '85vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

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

                <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 24, padding: '20px 24px' }}>

                    {catalogLevelId ? (
                        <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', padding: 16, flexShrink: 0 }}>
                            <p style={{ color: '#a1a1aa', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                                Nome e descrição deste nível são editados pelo ícone de lápis na lista. Aqui você gerencia apenas os membros com acesso direto no catálogo.
                            </p>
                        </div>
                    ) : (
                    /* INFO SECTION — altura preservada para não colapsar com a seção KBS */
                    <div className="card-base" style={{ background: '#18181b', border: '1px solid #27272a', padding: 16, flexShrink: 0 }}>
                        <h4 style={{ color: 'white', marginTop: 0, marginBottom: 12 }}>Informações do Nível</h4>
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
                                            border: icon === ic ? '1px solid #0EA5E9' : '1px solid #475569',
                                            borderRadius: 6,
                                            padding: 8,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flex: 1
                                        }}
                                        className="hover:bg-zinc-800"
                                    >
                                        <span style={{ marginRight: 6 }}>
                                            {ic === 'Crown' ? <Crown size={16} color={icon === ic ? '#38BDF8' : '#71717a'} /> : <Shield size={16} color={icon === ic ? '#38BDF8' : '#71717a'} />}
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
                    )}

                    {/* HERDADOS VIA CARGO (KBS) - somente leitura; lista com scroll interno para não sobrepor Informações do Nível */}
                    {kbsUsersForLevel.length > 0 && (
                        <div className="card-base" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: 16, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '240px' }}>
                            <h4 style={{ color: '#22c55e', marginBottom: 10, fontSize: 13, flexShrink: 0 }}>Herdados via Cargo (KBS)</h4>
                            <p style={{ color: '#71717a', fontSize: 12, marginBottom: 12, flexShrink: 0 }}>Estes colaboradores recebem este nível por padrão através da Gestão de Pessoas. Somente leitura.</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, overflowY: 'auto', minHeight: 0, flex: 1 }}>
                                {kbsUsersForLevel.map((u) => (
                                    <div
                                        key={u.id}
                                        style={{
                                            background: '#18181b',
                                            border: '1px solid #27272a',
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
                                        {u.email && <span style={{ fontSize: 11, color: '#71717a' }}>{u.email}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* USERS SECTION */}
                    <div style={{ flexShrink: 0, paddingBottom: 8 }}>
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
                                            <Plus size={14} color="#0EA5E9" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* LIST USERS - CHIPS LAYOUT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {usersInLevel.length === 0 && kbsUsersForLevel.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13, border: '1px solid #27272a', borderRadius: 8 }}>
                                    Nenhum usuário neste nível.
                                </div>
                            ) : usersInLevel.length === 0 ? null : (
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
                                                color: '#38BDF8',
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

                    {!catalogLevelId && (
                    <button onClick={handleSaveInfo} disabled={isSaving} className="btn-verify" style={{ width: 'auto', padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Save size={16} />
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    )}
                </div>
            </div>
        </div>
    );
};
