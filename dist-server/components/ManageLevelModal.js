"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageLevelModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react"); // Added icons
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const ManageLevelModal = ({ isOpen, onClose, tool, levelName, onUpdate, showToast, customConfirm }) => {
    if (!isOpen)
        return null;
    const [name, setName] = (0, react_1.useState)(levelName);
    const [description, setDescription] = (0, react_1.useState)('');
    const [icon, setIcon] = (0, react_1.useState)('Shield');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [allUsers, setAllUsers] = (0, react_1.useState)([]);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [showAllUsers, setShowAllUsers] = (0, react_1.useState)(false);
    // Filter users already in this level
    const usersInLevel = tool.accesses.filter((acc) => acc.status === levelName).map((acc) => acc.user);
    (0, react_1.useEffect)(() => {
        if (levelName) {
            // Keep name in sync only on mounting/level change significantly
            setName(levelName);
            const descData = tool.accessLevelDescriptions?.[levelName];
            // Handle both string (legacy) and object format
            if (typeof descData === 'string') {
                setDescription(descData);
                setIcon(levelName.match(/admin|owner/i) ? 'Crown' : 'Shield');
            }
            else if (typeof descData === 'object' && descData !== null) {
                setDescription(descData.description || '');
                setIcon(descData.icon || (levelName.match(/admin|owner/i) ? 'Crown' : 'Shield'));
            }
            else {
                setDescription('');
                setIcon(levelName.match(/admin|owner/i) ? 'Crown' : 'Shield');
            }
        }
    }, [levelName]);
    const loadUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`);
            if (res.ok)
                setAllUsers(await res.json());
        }
        catch (e) {
            console.error(e);
        }
    };
    // Load users once or when tool id changes
    (0, react_1.useEffect)(() => {
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
                showToast("Informações do nível salvas!", "success");
                onUpdate();
                onClose(); // Always close on success
            }
            else {
                const data = await res.json();
                showToast(data.error || "Erro ao salvar.", "error");
            }
        }
        catch (e) {
            showToast("Erro de conexão.", "error");
        }
        setIsSaving(false);
    };
    const addUser = async (userId) => {
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
            }
            else {
                showToast("Erro ao adicionar usuário.", "error");
            }
        }
        catch (e) {
            showToast("Erro ao adicionar usuário.", "error");
        }
    };
    const removeUser = async (userId) => {
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
                    }
                    else {
                        showToast("Erro ao remover usuário.", "error");
                    }
                }
                catch (e) {
                    showToast("Erro ao remover usuário.", "error");
                }
            }
        });
    };
    const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !usersInLevel.some((ul) => ul.id === u.id));
    // ... (rest of component state)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = (0, react_1.useState)(false);
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
                showToast("Nível de acesso removido.", "success");
                onUpdate();
                onClose();
            }
            else {
                const data = await res.json();
                showToast(data.error || "Erro ao excluir nível.", "error");
            }
        }
        catch (e) {
            showToast("Erro ao excluir nível.", "error");
        }
    };
    // ... (render)
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }, children: [isDeleteConfirmOpen && ((0, jsx_runtime_1.jsx)("div", { style: {
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8
                    }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                            background: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: 12,
                            padding: 24,
                            width: '90%',
                            maxWidth: 400,
                            textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                        }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 48, height: 48,
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '50%',
                                    color: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 24 }) }), (0, jsx_runtime_1.jsx)("h3", { style: { color: '#f4f4f5', margin: '0 0 8px', fontSize: 18 }, children: "Excluir N\u00EDvel?" }), (0, jsx_runtime_1.jsxs)("p", { style: { color: '#a1a1aa', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }, children: ["Tem certeza que deseja excluir o n\u00EDvel ", (0, jsx_runtime_1.jsx)("strong", { children: levelName }), "? ", (0, jsx_runtime_1.jsx)("br", {}), "Isso remover\u00E1 o acesso de todos os usu\u00E1rios vinculados a ele."] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setIsDeleteConfirmOpen(false), style: {
                                            flex: 1,
                                            background: 'transparent',
                                            border: '1px solid #3f3f46',
                                            color: '#e4e4e7',
                                            padding: '10px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            fontWeight: 500
                                        }, className: "hover:bg-zinc-800", children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { onClick: confirmDelete, style: {
                                            flex: 1,
                                            background: '#ef4444',
                                            border: 'none',
                                            color: 'white',
                                            padding: '10px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            fontWeight: 500
                                        }, className: "hover:bg-red-600", children: "Sim, Excluir" })] })] }) })), (0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["Gerenciar N\u00EDvel: ", levelName] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-body", style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: 'white', marginTop: 0 }, children: "Informa\u00E7\u00F5es do N\u00EDvel" }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome do N\u00EDvel" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "\u00CDcone do N\u00EDvel" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: ['Shield', 'Crown'].map(ic => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setIcon(ic), style: {
                                                    background: icon === ic ? '#3f3f46' : '#27272a',
                                                    border: icon === ic ? '1px solid #a78bfa' : '1px solid #3f3f46',
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flex: 1
                                                }, className: "hover:bg-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { style: { marginRight: 6 }, children: ic === 'Crown' ? (0, jsx_runtime_1.jsx)(lucide_react_1.Crown, { size: 16, color: icon === ic ? '#a78bfa' : '#71717a' }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Shield, { size: 16, color: icon === ic ? '#a78bfa' : '#71717a' }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13, color: icon === ic ? '#f4f4f5' : '#71717a', fontWeight: 500 }, children: ic === 'Crown' ? 'Coroa (Admin)' : 'Escudo (User)' })] }, ic))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "Descri\u00E7\u00E3o / Permiss\u00F5es" }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: e => setDescription(e.target.value), className: "form-input", style: { width: '100%', minHeight: 60 }, placeholder: "O que este n\u00EDvel pode fazer?" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h4", { style: { color: '#d4d4d8', marginBottom: 12 }, children: ["Gerenciar Membros (", usersInLevel.length, ")"] }), (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14, style: { position: 'absolute', left: 12, top: 11, color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: "form-input", placeholder: "Adicionar pessoa a este n\u00EDvel...", style: { width: '100%', paddingLeft: 34 } }), searchTerm && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'absolute', top: 40, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 20, maxHeight: 150, overflowY: 'auto' }, children: filteredUsers.map(u => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => addUser(u.id), style: { padding: '10px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', color: '#e4e4e7', fontSize: 13, display: 'flex', justifyContent: 'space-between' }, className: "hover:bg-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { children: u.name }), (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14, color: "#a78bfa" })] }, u.id))) }))] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: usersInLevel.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13, border: '1px solid #27272a', borderRadius: 8 }, children: "Nenhum usu\u00E1rio neste n\u00EDvel." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: (showAllUsers ? usersInLevel : usersInLevel.slice(0, 5)).map((u) => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                                        background: '#27272a',
                                                        border: '1px solid #3f3f46',
                                                        borderRadius: 20,
                                                        padding: '6px 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        fontSize: 13,
                                                        color: '#e4e4e7'
                                                    }, children: [(0, jsx_runtime_1.jsx)("span", { children: u.name }), (0, jsx_runtime_1.jsx)("button", { onClick: () => removeUser(u.id), style: {
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#71717a',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                padding: 0
                                                            }, className: "hover:text-red-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 14 }) })] }, u.id))) }), usersInLevel.length > 5 && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setShowAllUsers(!showAllUsers), style: {
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#a78bfa',
                                                    fontSize: 13,
                                                    cursor: 'pointer',
                                                    alignSelf: 'flex-start',
                                                    marginTop: 4
                                                }, children: showAllUsers ? 'Mostrar menos' : `Mostrar mais (${usersInLevel.length - 5})` }))] })) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-footer", style: { borderTop: '1px solid #27272a', padding: '16px 0 0 0', marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleDeleteClick, className: "btn-text", style: { color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }), " Excluir N\u00EDvel"] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSaveInfo, disabled: isSaving, className: "btn-verify", style: { width: 'auto', padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 16 }), isSaving ? 'Salvando...' : 'Salvar Alterações'] })] })] }) }));
};
exports.ManageLevelModal = ManageLevelModal;
