"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteDepartmentModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const DeleteDepartmentModal = ({ isOpen, onClose, department, allDepartments, userCount: initialUserCount = 0, onDeleted, showToast, customConfirm }) => {
    const [redirectToId, setRedirectToId] = (0, react_1.useState)('');
    const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
    const [userCount, setUserCount] = (0, react_1.useState)(initialUserCount);
    const [loadingCount, setLoadingCount] = (0, react_1.useState)(false);
    // Busca contagem em tempo real ao abrir — evita cache stale após mover cargos
    (0, react_1.useEffect)(() => {
        if (!isOpen || !department?.id)
            return;
        setLoadingCount(true);
        fetch(`${config_1.API_URL}/api/structure/departments/${department.id}/user-count`)
            .then(r => r.ok ? r.json() : { count: 0 })
            .then(data => setUserCount(data.count ?? 0))
            .catch(() => setUserCount(initialUserCount))
            .finally(() => setLoadingCount(false));
    }, [isOpen, department?.id]);
    if (!isOpen || !department)
        return null;
    const otherDepartments = allDepartments.filter(d => d.id !== department.id);
    const handleDelete = async () => {
        if (userCount > 0 && !redirectToId) {
            return showToast("Selecione um departamento de destino para os usuários.", "warning");
        }
        customConfirm({
            title: "Excluir Departamento?",
            message: `Tem certeza que deseja excluir o departamento "${department.name}"? Esta ação é irreversível.`,
            isDestructive: true,
            confirmLabel: "Sim, Excluir",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const res = await fetch(`${config_1.API_URL}/api/structure/departments/${department.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ redirectToDepartmentId: redirectToId || null })
                    });
                    if (res.ok) {
                        showToast("Departamento excluído com sucesso!", "success");
                        onDeleted();
                        onClose();
                    }
                    else {
                        const data = await res.json();
                        showToast(data.error || "Erro ao excluir departamento.", "error");
                    }
                }
                catch (e) {
                    showToast("Erro de conexão.", "error");
                }
                setIsDeleting(false);
            }
        });
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '450px', border: '1px solid #7f1d1d' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { style: { color: '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { size: 24 }), " Excluir Departamento"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#e4e4e7', fontSize: 14, lineHeight: 1.5 }, children: ["Voc\u00EA est\u00E1 prestes a excluir o departamento ", (0, jsx_runtime_1.jsx)("strong", { children: department.name }), "."] }), loadingCount ? ((0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 13, fontStyle: 'italic' }, children: "Verificando colaboradores vinculados..." })) : userCount > 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: '#f87171', fontSize: 13, marginBottom: 12, fontWeight: 500 }, children: ["\u26A0\uFE0F Existem ", userCount, " colaborador(es) vinculado(s) a este departamento.", (0, jsx_runtime_1.jsx)("br", {}), "Para onde deseja mov\u00EA-los?"] }), (0, jsx_runtime_1.jsxs)("select", { value: redirectToId, onChange: e => setRedirectToId(e.target.value), className: "form-input", style: { width: '100%', fontSize: 14, background: '#09090b' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecionar destino..." }), otherDepartments.map(d => ((0, jsx_runtime_1.jsx)("option", { value: d.id, children: d.name }, d.id)))] })] })) : ((0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 13, fontStyle: 'italic' }, children: "Este departamento n\u00E3o possui usu\u00E1rios vinculados. Os cargos vinculados tamb\u00E9m ser\u00E3o removidos." })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, marginTop: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-mini", style: { flex: 1, height: '42px', background: 'transparent', border: '1px solid #27272a' }, children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleDelete, disabled: isDeleting || loadingCount || (userCount > 0 && !redirectToId), className: "btn-verify", style: {
                                        flex: 2,
                                        height: '42px',
                                        background: '#ef4444',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        opacity: (userCount > 0 && !redirectToId) ? 0.5 : 1
                                    }, children: isDeleting ? 'Excluindo...' : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 18 }), " Confirmar Exclus\u00E3o"] }) })] })] })] }) }));
};
exports.DeleteDepartmentModal = DeleteDepartmentModal;
