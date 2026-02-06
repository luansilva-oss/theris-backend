"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditToolModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const EditToolModal = ({ isOpen, onClose, tool, onUpdate }) => {
    if (!isOpen)
        return null;
    const [activeTab, setActiveTab] = (0, react_1.useState)('IDENTITY');
    // Form Data
    const [name, setName] = (0, react_1.useState)(tool.name);
    const [acronym, setAcronym] = (0, react_1.useState)(tool.acronym || '');
    const [groupId, setGroupId] = (0, react_1.useState)(tool.toolGroupId || '');
    const [ownerId, setOwnerId] = (0, react_1.useState)(tool.owner?.id || '');
    const [subOwnerId, setSubOwnerId] = (0, react_1.useState)(tool.subOwner?.id || '');
    const [description, setDescription] = (0, react_1.useState)(tool.description || '');
    const [accessLevels, setAccessLevels] = (0, react_1.useState)(tool.availableAccessLevels || ["Admin", "User", "Viewer"]);
    // Data Lists
    const [availableGroups, setAvailableGroups] = (0, react_1.useState)([]);
    const [allUsers, setAllUsers] = (0, react_1.useState)([]);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    // UI States
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [newGroupMode, setNewGroupMode] = (0, react_1.useState)(false);
    const [newGroupName, setNewGroupName] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        loadAuxData();
    }, []);
    const loadAuxData = async () => {
        try {
            const [resGroups, resUsers] = await Promise.all([
                fetch(`${API_URL}/api/tool-groups`),
                fetch(`${API_URL}/api/users`)
            ]);
            if (resGroups.ok)
                setAvailableGroups(await resGroups.json());
            if (resUsers.ok)
                setAllUsers(await resUsers.json());
        }
        catch (e) {
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
                    description,
                    availableAccessLevels: accessLevels // Envia níveis também, caso tenha editado
                })
            });
            onUpdate();
            onClose();
        }
        catch (e) {
            alert("Erro ao salvar.");
        }
        setIsSaving(false);
    };
    const notifyUserChange = async (userId, level) => {
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, level })
            });
            onUpdate();
        }
        catch (e) {
            alert("Erro ao atualizar acesso.");
        }
    };
    const removeUser = async (userId) => {
        if (!confirm("Remover acesso?"))
            return;
        try {
            await fetch(`${API_URL}/api/tools/${tool.id}/access/${userId}`, { method: 'DELETE' });
            onUpdate(); // O pai atualizará a prop 'tool', que atualizará a UI? 
            // OBS: como 'tool' vem via props, a lista de usuários aqui na modal só atualiza se o pai atualizar e repassar.
            // Idealmente, a modal devia ter um state local de users ou chamar onUpdate e esperar.
        }
        catch (e) {
            alert("Erro.");
        }
    };
    const createGroup = async () => {
        if (!newGroupName)
            return;
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
        }
        catch (e) {
            alert("Erro ao criar grupo.");
        }
    };
    // Filter users for selection inputs
    const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '800px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["Editar ", tool.name] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', borderBottom: '1px solid #27272a', marginBottom: 20 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setActiveTab('IDENTITY'), style: {
                                padding: '12px 24px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'IDENTITY' ? '2px solid #8b5cf6' : 'none',
                                color: activeTab === 'IDENTITY' ? 'white' : '#71717a',
                                cursor: 'pointer',
                                fontWeight: 600
                            }, children: "Identidade & Grupo" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setActiveTab('ACCESS'), style: {
                                padding: '12px 24px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'ACCESS' ? '2px solid #8b5cf6' : 'none',
                                color: activeTab === 'ACCESS' ? 'white' : '#71717a',
                                cursor: 'pointer',
                                fontWeight: 600
                            }, children: "Acessos & Pessoas" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, overflowY: 'auto', paddingRight: 10 }, children: [activeTab === 'IDENTITY' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome do Sistema" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Sigla / Acr\u00F4nimo" }), (0, jsx_runtime_1.jsx)("input", { value: acronym, onChange: e => setAcronym(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 }, placeholder: "Ex: AWS" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Grupo / Categoria" }), !newGroupMode ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsxs)("select", { value: groupId, onChange: e => setGroupId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem Grupo" }), availableGroups.map(g => (0, jsx_runtime_1.jsx)("option", { value: g.id, children: g.name }, g.id))] }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => setNewGroupMode(true), className: "btn-mini", style: { whiteSpace: 'nowrap' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }), " Novo Grupo"] })] })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { value: newGroupName, onChange: e => setNewGroupName(e.target.value), placeholder: "Nome do novo grupo", className: "form-input", style: { width: '100%', fontSize: 14 } }), (0, jsx_runtime_1.jsx)("button", { onClick: createGroup, className: "btn-mini approve", children: "Criar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setNewGroupMode(false), className: "btn-mini reject", children: "Cancelar" })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Owner (Dono do Produto)" }), (0, jsx_runtime_1.jsxs)("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), allUsers.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Sub-Owner (T\u00E9cnico / Backup)" }), (0, jsx_runtime_1.jsxs)("select", { value: subOwnerId, onChange: e => setSubOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), allUsers.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Descri\u00E7\u00E3o do Sistema" }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: e => setDescription(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14, minHeight: '80px', resize: 'vertical' }, placeholder: "Descreva a finalidade desta ferramenta..." })] }), (0, jsx_runtime_1.jsx)("div", { style: { marginTop: 20, paddingTop: 20, borderTop: '1px solid #27272a' }, children: (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveIdentity, disabled: isSaving, className: "btn-verify", style: { width: 'auto', padding: '10px 30px' }, children: isSaving ? 'Salvando...' : 'Salvar Alterações' }) })] })), activeTab === 'ACCESS' && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: 'white', margin: '0 0 10px 0' }, children: "N\u00EDveis de Acesso Dispon\u00EDveis" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }, children: accessLevels.map(lvl => ((0, jsx_runtime_1.jsxs)("span", { style: { background: '#3f3f46', padding: '4px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }, children: [lvl, (0, jsx_runtime_1.jsx)("button", { onClick: () => setAccessLevels(accessLevels.filter(l => l !== lvl)), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 12 }) })] }, lvl))) }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { id: "newLevelInput", placeholder: "Novo n\u00EDvel (ex: Auditor)", className: "form-input", style: { flex: 1, fontSize: 13, height: 36 } }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                                        const el = document.getElementById('newLevelInput');
                                                        if (el.value && !accessLevels.includes(el.value)) {
                                                            setAccessLevels([...accessLevels, el.value]);
                                                            el.value = '';
                                                        }
                                                    }, className: "btn-mini", children: "Adicionar e Salvar" })] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'flex-end' }, children: (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveIdentity, disabled: isSaving, className: "btn-verify", style: { width: 'auto', padding: '8px 20px', fontSize: 13 }, children: isSaving ? 'Salvando Configurações...' : 'Salvar Níveis e Alterações' }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: 'white', margin: '0 0 10px 0' }, children: "Adicionar Usu\u00E1rio ao Sistema" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 10, alignItems: 'center' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, position: 'relative' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14, style: { position: 'absolute', left: 10, top: 12, color: '#71717a' } }), (0, jsx_runtime_1.jsx)("input", { value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Buscar pessoa...", className: "form-input", style: { width: '100%', paddingLeft: 30, fontSize: 14 } }), searchTerm && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'absolute', top: 45, left: 0, right: 0, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }, children: filteredUsers.slice(0, 5).map(u => ((0, jsx_runtime_1.jsx)("div", { onClick: () => {
                                                                // Adicionar direto default 'User'
                                                                notifyUserChange(u.id, accessLevels[1] || 'User'); // Pega o segundo nível ou User
                                                                setSearchTerm('');
                                                            }, style: { padding: '8px 12px', borderBottom: '1px solid #27272a', cursor: 'pointer', fontSize: 13, color: '#d4d4d8' }, className: "hover:bg-zinc-800", children: u.name }, u.id + "_search"))) }))] }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "card-base", style: { padding: 0, border: '1px solid #27272a', overflow: 'hidden' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { style: { background: '#18181b', color: '#a1a1aa' }, children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: 12, textAlign: 'left' }, children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 12, textAlign: 'left' }, children: "N\u00EDvel Atual" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: 12, width: 40 } })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: tool.accesses && tool.accesses.map(acc => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #27272a', color: '#e4e4e7' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: 12 }, children: acc.user.name }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 12 }, children: (0, jsx_runtime_1.jsx)("select", { value: acc.status, onChange: (e) => notifyUserChange(acc.user.id, e.target.value), style: { background: '#27272a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }, children: accessLevels.map(l => (0, jsx_runtime_1.jsx)("option", { value: l, children: l }, l)) }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: 12 }, children: (0, jsx_runtime_1.jsx)("button", { onClick: () => removeUser(acc.user.id), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }) }) })] }, acc.user.id))) })] }) })] }))] })] }) }));
};
exports.EditToolModal = EditToolModal;
