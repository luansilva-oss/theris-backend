"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateToolModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
const CreateToolModal = ({ isOpen, onClose, onCreated }) => {
    if (!isOpen)
        return null;
    const [name, setName] = (0, react_1.useState)('');
    const [acronym, setAcronym] = (0, react_1.useState)('');
    const [description, setDescription] = (0, react_1.useState)('');
    const [ownerId, setOwnerId] = (0, react_1.useState)('');
    const [subOwnerId, setSubOwnerId] = (0, react_1.useState)('');
    const [accessLevels, setAccessLevels] = (0, react_1.useState)(['Admin', 'User', 'Viewer']);
    const [newLevel, setNewLevel] = (0, react_1.useState)('');
    const [groupId, setGroupId] = (0, react_1.useState)('');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [groups, setGroups] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [newGroupMode, setNewGroupMode] = (0, react_1.useState)(false);
    const [newGroupName, setNewGroupName] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        fetch(`${API_URL}/api/tool-groups`)
            .then(res => res.json())
            .then(setGroups);
        fetch(`${API_URL}/api/users`)
            .then(res => res.json())
            .then(setUsers);
    }, []);
    const handleCreate = async () => {
        if (!name.trim())
            return alert("Nome é obrigatório.");
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
            }
            else {
                alert("Erro ao criar.");
            }
        }
        catch (e) {
            alert("Erro de rede.");
        }
        setIsSaving(false);
    };
    const addAccessLevel = () => {
        if (newLevel.trim() && !accessLevels.includes(newLevel.trim())) {
            setAccessLevels([...accessLevels, newLevel.trim()]);
            setNewLevel('');
        }
    };
    const removeAccessLevel = (level) => {
        setAccessLevels(accessLevels.filter(l => l !== level));
    };
    const handleCreateGroup = async () => {
        if (!newGroupName.trim())
            return;
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
        }
        catch (e) {
            alert("Erro ao criar grupo.");
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '500px' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Nova Ferramenta" }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 15, maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Nome da Ferramenta" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), placeholder: "Ex: ClickUp, AWS, Figma", className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Acr\u00F4nimo / Sigla (Opcional)" }), (0, jsx_runtime_1.jsx)("input", { value: acronym, onChange: e => setAcronym(e.target.value), placeholder: "Ex: CU, AWS, FG", className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: e => setDescription(e.target.value), placeholder: "O que esta ferramenta faz?", className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14, minHeight: 80, padding: 12 } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Dono (Owner)" }), (0, jsx_runtime_1.jsxs)("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecionar..." }), users.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Sub-Owner" }), (0, jsx_runtime_1.jsxs)("select", { value: subOwnerId, onChange: e => setSubOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecionar..." }), users.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "N\u00EDveis de Acesso" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { value: newLevel, onChange: e => setNewLevel(e.target.value), placeholder: "Novo n\u00EDvel (ex: Admin)", className: "form-input", style: { flex: 1, fontSize: 13 }, onKeyPress: e => e.key === 'Enter' && addAccessLevel() }), (0, jsx_runtime_1.jsx)("button", { onClick: addAccessLevel, className: "btn-mini", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }) })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: accessLevels.map(level => ((0, jsx_runtime_1.jsxs)("span", { style: { background: '#27272a', padding: '4px 10px', borderRadius: 15, fontSize: 11, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: 6 }, children: [level, (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 12, style: { cursor: 'pointer' }, onClick: () => removeAccessLevel(level) })] }, level))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12 }, children: "Grupo / Categoria" }), !newGroupMode ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsxs)("select", { value: groupId, onChange: e => setGroupId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem Grupo" }), groups.map(g => (0, jsx_runtime_1.jsx)("option", { value: g.id, children: g.name }, g.id))] }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => setNewGroupMode(true), className: "btn-mini", style: { whiteSpace: 'nowrap' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }), " Novo"] })] })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { value: newGroupName, onChange: e => setNewGroupName(e.target.value), placeholder: "Nome do grupo", className: "form-input", style: { width: '100%', fontSize: 14 } }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCreateGroup, className: "btn-mini approve", children: "Criar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setNewGroupMode(false), className: "btn-mini reject", children: "X" })] }))] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCreate, disabled: isSaving, className: "btn-verify", style: { marginTop: 10, width: '100%' }, children: isSaving ? 'Criando...' : 'Cadastrar Ferramenta' })] })] }) }));
};
exports.CreateToolModal = CreateToolModal;
