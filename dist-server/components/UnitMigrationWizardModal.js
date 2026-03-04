"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitMigrationWizardModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const UnitMigrationWizardModal = ({ isOpen, onClose, unit, departments, otherUnits, allDepartments, onSuccess, showToast }) => {
    const [decisions, setDecisions] = (0, react_1.useState)({});
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    if (!isOpen || !unit)
        return null;
    const setDecision = (deptId, action, targetUnitId, targetDepartmentId) => {
        setDecisions(prev => ({
            ...prev,
            [deptId]: { departmentId: deptId, action, targetUnitId, targetDepartmentId }
        }));
    };
    const canSubmit = departments.every(d => {
        const dec = decisions[d.id];
        if (!dec)
            return false;
        if (dec.action === 'migrate_department')
            return !!dec.targetUnitId;
        return !!dec.targetDepartmentId;
    });
    const handleSubmit = async () => {
        if (!canSubmit)
            return showToast('Preencha todas as decisões (destino para cada departamento).', 'warning');
        setIsSubmitting(true);
        try {
            const payload = { decisions: Object.values(decisions) };
            const res = await fetch(`${config_1.API_URL}/api/structure/units/${unit.id}/migrate-and-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast('Migração concluída. Unidade excluída.', 'success');
                onSuccess();
                onClose();
            }
            else {
                const data = await res.json();
                showToast(data.error || 'Erro na migração.', 'error');
            }
        }
        catch {
            showToast('Erro de conexão.', 'error');
        }
        setIsSubmitting(false);
    };
    const departmentsInOtherUnits = allDepartments.filter(d => d.unitId && d.unitId !== unit.id);
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '560px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { size: 22, color: "#f59e0b" }), " Migrar e excluir unidade"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px 20px', overflowY: 'auto', flex: 1 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#a1a1aa', fontSize: 13, marginBottom: 20 }, children: ["A unidade ", (0, jsx_runtime_1.jsx)("strong", { style: { color: '#f4f4f5' }, children: unit.name }), " possui departamentos. Para cada um, escolha migrar o departamento inteiro para outra unidade ou excluir o departamento (movendo os cargos para um departamento de destino)."] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: departments.map(dept => {
                                const dec = decisions[dept.id];
                                const action = dec?.action ?? null;
                                return ((0, jsx_runtime_1.jsxs)("div", { style: { border: '1px solid #27272a', borderRadius: 10, padding: 16, background: '#18181b' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, color: '#e4e4e7', marginBottom: 8 }, children: dept.name }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 12, color: '#71717a', marginBottom: 12 }, children: [dept.rolesCount, " cargo(s) \u00B7 KBS preservado em qualquer op\u00E7\u00E3o"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#e4e4e7', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: `action-${dept.id}`, checked: action === 'migrate_department', onChange: () => setDecision(dept.id, 'migrate_department') }), "Migrar departamento inteiro"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#e4e4e7', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: `action-${dept.id}`, checked: action === 'delete_department', onChange: () => setDecision(dept.id, 'delete_department') }), "Excluir departamento (mapear cargos)"] })] }), action === 'migrate_department' && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }, children: "Unidade de destino" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", style: { width: '100%' }, value: dec?.targetUnitId ?? '', onChange: e => setDecision(dept.id, 'migrate_department', e.target.value || undefined), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), otherUnits.filter(u => u.id !== unit.id).map(u => ((0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id)))] })] })), action === 'delete_department' && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }, children: "Departamento que receber\u00E1 os cargos" }), (0, jsx_runtime_1.jsxs)("select", { className: "form-input", style: { width: '100%' }, value: dec?.targetDepartmentId ?? '', onChange: e => setDecision(dept.id, 'delete_department', undefined, e.target.value || undefined), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), departmentsInOtherUnits.map(d => ((0, jsx_runtime_1.jsxs)("option", { value: d.id, children: [d.name, " ", d.unit?.name ? `(${d.unit.name})` : ''] }, d.id)))] })] }))] }, dept.id));
                            }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '16px 20px', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "btn-text", children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSubmit, disabled: !canSubmit || isSubmitting, className: "btn-verify", style: { display: 'flex', alignItems: 'center', gap: 8 }, children: isSubmitting ? 'Executando...' : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { size: 18 }), " Migrar e excluir unidade"] }) })] })] }) }));
};
exports.UnitMigrationWizardModal = UnitMigrationWizardModal;
