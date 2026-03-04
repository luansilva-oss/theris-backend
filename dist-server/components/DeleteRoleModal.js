"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteRoleModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const DeleteRoleModal = ({ isOpen, onClose, role, units, userCountInRole, onDeleted, showToast }) => {
    const [selectedUnitId, setSelectedUnitId] = (0, react_1.useState)('');
    const [selectedDeptId, setSelectedDeptId] = (0, react_1.useState)('');
    const [selectedRoleId, setSelectedRoleId] = (0, react_1.useState)('');
    const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
    const departmentsForUnit = (0, react_1.useMemo)(() => {
        if (!selectedUnitId)
            return [];
        const u = units.find(x => x.id === selectedUnitId);
        return u?.departments ?? [];
    }, [units, selectedUnitId]);
    const rolesForDept = (0, react_1.useMemo)(() => {
        if (!selectedDeptId)
            return [];
        const d = departmentsForUnit.find(x => x.id === selectedDeptId);
        return (d?.roles ?? []).filter(r => r.id !== role?.id);
    }, [departmentsForUnit, selectedDeptId, role?.id]);
    const canConfirm = userCountInRole === 0 || (userCountInRole > 0 && !!selectedRoleId);
    if (!isOpen || !role)
        return null;
    const handleUnitChange = (unitId) => {
        setSelectedUnitId(unitId);
        setSelectedDeptId('');
        setSelectedRoleId('');
    };
    const handleDeptChange = (deptId) => {
        setSelectedDeptId(deptId);
        setSelectedRoleId('');
    };
    const handleDelete = async () => {
        if (userCountInRole > 0 && !selectedRoleId) {
            showToast('Selecione o novo cargo de destino para os colaboradores.', 'warning');
            return;
        }
        setIsDeleting(true);
        try {
            const res = await fetch(`${config_1.API_URL}/api/structure/roles/${role.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fallbackRoleId: selectedRoleId || undefined })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showToast('Cargo excluído com sucesso!', 'success');
                onDeleted();
                onClose();
            }
            else {
                showToast(data.error || 'Erro ao excluir cargo.', 'error');
            }
        }
        catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setIsDeleting(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '480px', width: '95%', border: '1px solid #7f1d1d' }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { style: { color: '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { size: 24 }), " Excluir cargo"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#e4e4e7', fontSize: 14, lineHeight: 1.5 }, children: ["Voc\u00EA est\u00E1 prestes a excluir o cargo ", (0, jsx_runtime_1.jsx)("strong", { children: role.name }), role.department?.name && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [" do departamento ", role.department.name] }), "."] }), userCountInRole > 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#f87171', fontSize: 13, marginBottom: 12, fontWeight: 500 }, children: ["\u26A0\uFE0F Existem ", userCountInRole, " colaborador(es) neste cargo.", (0, jsx_runtime_1.jsx)("br", {}), "Selecione o novo cargo de destino antes de excluir."] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }, children: "1. Unidade" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedUnitId, onChange: e => handleUnitChange(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14, background: '#09090b' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione a unidade..." }), units.map(u => ((0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id)))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }, children: "2. Departamento" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedDeptId, onChange: e => handleDeptChange(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14, background: '#09090b' }, disabled: !selectedUnitId, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione o departamento..." }), departmentsForUnit.map(d => ((0, jsx_runtime_1.jsx)("option", { value: d.id, children: d.name }, d.id)))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 4 }, children: "3. Novo cargo" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedRoleId, onChange: e => setSelectedRoleId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14, background: '#09090b' }, disabled: !selectedDeptId, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione o cargo..." }), rolesForDept.map(r => ((0, jsx_runtime_1.jsx)("option", { value: r.id, children: r.name }, r.id)))] })] })] })] })) : ((0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 13, fontStyle: 'italic' }, children: "Este cargo n\u00E3o possui colaboradores vinculados. As ferramentas KBS do cargo tamb\u00E9m ser\u00E3o removidas." })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, marginTop: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-mini", style: { flex: 1, height: '42px', background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7' }, children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleDelete, disabled: isDeleting || !canConfirm, className: "btn-verify", style: {
                                        flex: 2,
                                        height: '42px',
                                        background: '#ef4444',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        opacity: canConfirm ? 1 : 0.5,
                                        color: 'white'
                                    }, children: isDeleting ? 'Excluindo...' : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 18 }), " Confirmar exclus\u00E3o"] }) })] })] })] }) }));
};
exports.DeleteRoleModal = DeleteRoleModal;
