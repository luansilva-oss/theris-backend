"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageLevelModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react"); // Added icons
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const ManageLevelModal = ({ isOpen, onClose, tool, levelName, onUpdate }) => {
    if (!isOpen)
        return null;
    const [name, setName] = (0, react_1.useState)(levelName);
    const [description, setDescription] = (0, react_1.useState)('');
    const [icon, setIcon] = (0, react_1.useState)('Shield');
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [allUsers, setAllUsers] = (0, react_1.useState)([]);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
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
                onUpdate();
                if (name !== levelName)
                    onClose(); // Close if renamed to avoid confusion
            }
            else {
                const data = await res.json();
                alert(data.error || "Erro ao salvar.");
            }
        }
        catch (e) {
            alert("Erro de conexão.");
        }
        setIsSaving(false);
    };
    const handleDeleteLevel = async () => {
        if (!confirm(`Tem certeza que deseja EXCLUIR o nível "${levelName}"? Isso removerá o acesso de todos os usuários neste nível.`))
            return;
        try {
            const res = await fetch(`${API_URL}/api/tools/${tool.id}/level/${encodeURIComponent(levelName)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                onUpdate();
                onClose();
            }
            else {
                const data = await res.json();
                alert(data.error || "Erro ao excluir nível.");
            }
        }
        catch (e) {
            alert("Erro ao excluir nível.");
        }
    };
    const addUser = async (userId) => {
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level: levelName }) // Use current levelName
            });
            onUpdate();
            setSearchTerm('');
        }
        catch (e) {
            alert("Erro ao adicionar usuário.");
        }
    };
    const removeUser = async (userId) => {
        if (!confirm("Remover usuário deste nível?"))
            return;
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
            onUpdate();
        }
        catch (e) {
            alert("Erro ao remover usuário.");
        }
    };
    const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !usersInLevel.some((ul) => ul.id === u.id));
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["Gerenciar N\u00EDvel: ", levelName] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-body", style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: 'white', marginTop: 0 }, children: "Informa\u00E7\u00F5es do N\u00EDvel" }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome do N\u00EDvel" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%' } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "\u00CDcone do N\u00EDvel" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: ['Shield', 'Crown'].map(ic => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setIcon(ic), style: {
                                                    background: icon === ic ? '#3f3f46' : '#27272a',
                                                    border: icon === ic ? '1px solid #a78bfa' : '1px solid #3f3f46',
                                                    borderRadius: 6,
                                                    padding: 8,
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flex: 1
                                                }, className: "hover:bg-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { style: { marginRight: 6 }, children: ic === 'Crown' ? (0, jsx_runtime_1.jsx)(lucide_react_1.Crown, { size: 16, color: icon === ic ? '#a78bfa' : '#71717a' }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Shield, { size: 16, color: icon === ic ? '#a78bfa' : '#71717a' }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13, color: icon === ic ? '#f4f4f5' : '#71717a', fontWeight: 500 }, children: ic === 'Crown' ? 'Coroa (Admin)' : 'Escudo (User)' })] }, ic))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "Descri\u00E7\u00E3o / Permiss\u00F5es" }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: e => setDescription(e.target.value), className: "form-input", style: { width: '100%', minHeight: 60 }, placeholder: "O que este n\u00EDvel pode fazer?" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h4", { style: { color: '#d4d4d8', marginBottom: 12 }, children: ["Gerenciar Membros (", usersInLevel.length, ")"] }), (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14, style: { position: 'absolute', left: 12, top: 11, color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: "form-input", placeholder: "Adicionar pessoa a este n\u00EDvel...", style: { width: '100%', paddingLeft: 34 } }), searchTerm && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'absolute', top: 40, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 20, maxHeight: 150, overflowY: 'auto' }, children: filteredUsers.map(u => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => addUser(u.id), style: { padding: '10px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', color: '#e4e4e7', fontSize: 13, display: 'flex', justifyContent: 'space-between' }, className: "hover:bg-zinc-800", children: [(0, jsx_runtime_1.jsx)("span", { children: u.name }), (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14, color: "#a78bfa" })] }, u.id))) }))] }), (0, jsx_runtime_1.jsx)("div", { className: "card-base", style: { padding: 0, border: '1px solid #27272a', overflow: 'hidden' }, children: usersInLevel.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13 }, children: "Nenhum usu\u00E1rio neste n\u00EDvel." })) : (usersInLevel.map((u) => ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '12px 16px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: '#e4e4e7', fontSize: 13 }, children: u.name }), (0, jsx_runtime_1.jsx)("button", { onClick: () => removeUser(u.id), className: "btn-icon", style: { color: '#ef4444' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }) })] }, u.id)))) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "modal-footer", style: { borderTop: '1px solid #27272a', padding: '16px 0 0 0', marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleDeleteLevel, className: "btn-text", style: { color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }), " Excluir N\u00EDvel"] }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSaveInfo, disabled: isSaving, className: "btn-verify", style: { width: 'auto', padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 16 }), isSaving ? 'Salvando...' : 'Salvar Alterações'] })] })] }) }));
};
exports.ManageLevelModal = ManageLevelModal;
