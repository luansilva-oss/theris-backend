"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportExportModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const CATEGORY_OPTIONS = [
    { value: 'GESTAO_PESSOAS', label: 'Gestão de Pessoas' },
    { value: 'GESTAO_ACESSOS', label: 'Gestão de Acessos' },
    { value: 'TI_INFRA', label: 'TI / Infra' },
];
const COLUMN_OPTIONS = [
    { key: 'id', label: 'ID do chamado' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'assunto', label: 'Assunto / Tipo' },
    { key: 'status', label: 'Status' },
    { key: 'solicitante', label: 'Solicitante' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'data', label: 'Data e Hora' },
    { key: 'justificativa', label: 'Justificativa' },
    { key: 'detalhes', label: 'Detalhes (Slack)' },
    { key: 'observacao', label: 'Observação' },
];
const ReportExportModal = ({ isOpen, onClose, onSuccess, currentUserId }) => {
    const deRef = (0, react_1.useRef)(null);
    const ateRef = (0, react_1.useRef)(null);
    const [startDate, setStartDate] = (0, react_1.useState)('');
    const [endDate, setEndDate] = (0, react_1.useState)('');
    const [categories, setCategories] = (0, react_1.useState)({
        GESTAO_PESSOAS: true,
        GESTAO_ACESSOS: true,
        TI_INFRA: true,
    });
    const [columns, setColumns] = (0, react_1.useState)(() => {
        const o = {};
        COLUMN_OPTIONS.forEach(c => { o[c.key] = true; });
        return o;
    });
    const [exporting, setExporting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    if (!isOpen)
        return null;
    const handleExport = async () => {
        setError('');
        if (!startDate || !endDate) {
            setError('Preencha o período (De e Até).');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('A data "De" deve ser anterior à data "Até".');
            return;
        }
        const cats = Object.entries(categories).filter(([, v]) => v).map(([k]) => k);
        if (cats.length === 0)
            cats.push('GESTAO_PESSOAS', 'GESTAO_ACESSOS', 'TI_INFRA');
        const cols = Object.entries(columns).filter(([, v]) => v).map(([k]) => k);
        if (cols.length === 0)
            cols.push('id', 'categoria', 'assunto');
        setExporting(true);
        try {
            const params = new URLSearchParams();
            params.set('startDate', new Date(startDate).toISOString());
            params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
            cats.forEach(c => params.append('categories', c));
            cols.forEach(c => params.append('columns', c));
            const headers = { 'x-user-id': currentUserId };
            const res = await fetch(`${config_1.API_URL}/api/requests/export/csv?${params}`, { headers });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Erro ao exportar.');
            }
            const blob = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = 'relatorio.csv';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/);
                if (match)
                    filename = match[1];
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            onSuccess();
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Erro ao exportar.');
        }
        finally {
            setExporting(false);
        }
    };
    const toggleAllCategories = (checked) => {
        setCategories({ GESTAO_PESSOAS: checked, GESTAO_ACESSOS: checked, TI_INFRA: checked });
    };
    const allCategoriesChecked = categories.GESTAO_PESSOAS && categories.GESTAO_ACESSOS && categories.TI_INFRA;
    const toggleAllColumns = (checked) => {
        const o = {};
        COLUMN_OPTIONS.forEach(c => { o[c.key] = checked; });
        setColumns(o);
    };
    const allColumnsChecked = COLUMN_OPTIONS.every(c => columns[c.key]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: 480 }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsxs)("h2", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { size: 22 }), " Exportar Relat\u00F3rio CSV"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }, children: [error && (0, jsx_runtime_1.jsx)("div", { style: { padding: 10, background: 'rgba(239,68,68,0.15)', borderRadius: 8, color: '#ef4444', fontSize: 13 }, children: error }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }, children: "Per\u00EDodo *" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, cursor: 'pointer' }, onClick: () => deRef.current?.showPicker?.(), children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "De" }), (0, jsx_runtime_1.jsx)("input", { ref: deRef, type: "date", value: startDate, onChange: e => setStartDate(e.target.value), className: "form-input", style: { width: '100%', cursor: 'pointer' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, cursor: 'pointer' }, onClick: () => ateRef.current?.showPicker?.(), children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#71717a', marginBottom: 4 }, children: "At\u00E9" }), (0, jsx_runtime_1.jsx)("input", { ref: ateRef, type: "date", value: endDate, onChange: e => setEndDate(e.target.value), className: "form-input", style: { width: '100%', cursor: 'pointer' } })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }, children: "Categoria" }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: allCategoriesChecked, onChange: e => toggleAllCategories(e.target.checked) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13 }, children: "Todos" })] }), CATEGORY_OPTIONS.map(c => ((0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: categories[c.value] !== false, onChange: e => setCategories(prev => ({ ...prev, [c.value]: e.target.checked })) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13 }, children: c.label })] }, c.value)))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }, children: "Colunas a incluir" }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: allColumnsChecked, onChange: e => toggleAllColumns(e.target.checked) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13 }, children: "Todas" })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: COLUMN_OPTIONS.map(c => ((0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: columns[c.key] !== false, onChange: e => setColumns(prev => ({ ...prev, [c.key]: e.target.checked })) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13 }, children: c.label })] }, c.key))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, marginTop: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { flex: 1 }, onClick: handleExport, disabled: exporting, children: exporting ? 'Exportando...' : 'Exportar CSV' }), (0, jsx_runtime_1.jsx)("button", { className: "btn-verify", style: { background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }, onClick: onClose, children: "Cancelar" })] })] })] }) }));
};
exports.ReportExportModal = ReportExportModal;
