"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditToolModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const EditToolModal = ({ isOpen, onClose, tool, onUpdate, showToast }) => {
    if (!isOpen)
        return null;
    // Form Data (apenas Identidade & Grupo - Acessos ficam em Gestão de Pessoas)
    const [name, setName] = (0, react_1.useState)(tool.name);
    const [acronym, setAcronym] = (0, react_1.useState)(tool.acronym || '');
    const [groupId, setGroupId] = (0, react_1.useState)(tool.toolGroupId || '');
    const [ownerId, setOwnerId] = (0, react_1.useState)(tool.owner?.id || '');
    const [subOwnerId, setSubOwnerId] = (0, react_1.useState)(tool.subOwner?.id || '');
    const [description, setDescription] = (0, react_1.useState)(tool.description || '');
    // Data Lists
    const [availableGroups, setAvailableGroups] = (0, react_1.useState)([]);
    const [allUsers, setAllUsers] = (0, react_1.useState)([]);
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
                fetch(`${config_1.API_URL}/api/tool-groups`),
                fetch(`${config_1.API_URL}/api/users`)
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
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${config_1.API_URL}/api/tools/${tool.id}`, {
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
            }
            else {
                const data = await res.json();
                showToast(data.error || "Erro ao salvar.", "error");
            }
        }
        catch (e) {
            showToast("Erro ao salvar.", "error");
        }
        setIsSaving(false);
    };
    const createGroup = async () => {
        if (!newGroupName)
            return;
        try {
            const res = await fetch(`${config_1.API_URL}/api/tool-groups`, {
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
            }
            else {
                showToast("Erro ao criar grupo.", "error");
            }
        }
        catch (e) {
            showToast("Erro ao criar grupo.", "error");
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '600px', width: '90%', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["Editar ", tool.name] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflowY: 'auto', paddingRight: 10 }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Nome do Sistema" }), (0, jsx_runtime_1.jsx)("input", { value: name, onChange: e => setName(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Sigla / Acr\u00F4nimo" }), (0, jsx_runtime_1.jsx)("input", { value: acronym, onChange: e => setAcronym(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14 }, placeholder: "Ex: AWS" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Grupo / Categoria" }), !newGroupMode ? ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsxs)("select", { value: groupId, onChange: e => setGroupId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem Grupo" }), availableGroups.map(g => (0, jsx_runtime_1.jsx)("option", { value: g.id, children: g.name }, g.id))] }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => setNewGroupMode(true), className: "btn-mini", style: { whiteSpace: 'nowrap' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14 }), " Novo Grupo"] })] })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { value: newGroupName, onChange: e => setNewGroupName(e.target.value), placeholder: "Nome do novo grupo", className: "form-input", style: { width: '100%', fontSize: 14 } }), (0, jsx_runtime_1.jsx)("button", { onClick: createGroup, className: "btn-mini approve", children: "Criar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setNewGroupMode(false), className: "btn-mini reject", children: "Cancelar" })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Owner (Dono do Produto)" }), (0, jsx_runtime_1.jsxs)("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), allUsers.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Sub-Owner (T\u00E9cnico / Backup)" }), (0, jsx_runtime_1.jsxs)("select", { value: subOwnerId, onChange: e => setSubOwnerId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), allUsers.map(u => (0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Descri\u00E7\u00E3o do Sistema" }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: e => setDescription(e.target.value), className: "form-input", style: { width: '100%', textAlign: 'left', fontSize: 14, minHeight: '80px', resize: 'vertical' }, placeholder: "Descreva a finalidade desta ferramenta..." })] }), (0, jsx_runtime_1.jsx)("div", { style: { marginTop: 20, paddingTop: 20, borderTop: '1px solid #27272a' }, children: (0, jsx_runtime_1.jsx)("button", { onClick: handleSave, disabled: isSaving, className: "btn-verify", style: { width: 'auto', padding: '10px 30px' }, children: isSaving ? 'Salvando...' : 'Salvar Alterações' }) })] }) })] }) }));
};
exports.EditToolModal = EditToolModal;
