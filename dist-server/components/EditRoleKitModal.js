"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditRoleKitModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const config_1 = require("../config");
const EntityAuditHistory_1 = require("./EntityAuditHistory");
const EditRoleKitModal = ({ isOpen, onClose, role, departmentId, units = [], departments = [], onUpdate, showToast, onOpenAuditHistory }) => {
    if (!isOpen)
        return null;
    const isCreateMode = !role;
    const [roleName, setRoleName] = (0, react_1.useState)('');
    const [roleCode, setRoleCode] = (0, react_1.useState)('');
    const [selectedDepartmentId, setSelectedDepartmentId] = (0, react_1.useState)('');
    const [selectedUnitId, setSelectedUnitId] = (0, react_1.useState)('');
    const [kitItems, setKitItems] = (0, react_1.useState)([]);
    const [tools, setTools] = (0, react_1.useState)([]);
    const [toolsAndLevelsMap, setToolsAndLevelsMap] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const selectedDept = departments.find(d => d.id === selectedDepartmentId);
    const unitOfSelectedDept = selectedDept?.unitId ? units.find(u => u.id === selectedDept.unitId) : null;
    (0, react_1.useEffect)(() => {
        if (isCreateMode) {
            setRoleName('');
            setRoleCode('');
            setSelectedDepartmentId(departmentId || '');
            const dept = departments.find(d => d.id === departmentId);
            setSelectedUnitId(dept?.unitId || '');
            setKitItems([]);
            setLoading(true);
            Promise.all([
                fetch(`${config_1.API_URL}/api/tools`).then(r => r.ok ? r.json() : []),
                fetch(`${config_1.API_URL}/api/tools-and-levels`).then(r => r.ok ? r.json() : {})
            ]).then(([toolsList, levelsMap]) => {
                setTools(toolsList || []);
                setToolsAndLevelsMap(levelsMap || {});
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        }
        else if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
            setSelectedDepartmentId(role.departmentId || '');
            const dept = departments.find(d => d.id === role.departmentId) ?? role.department;
            setSelectedUnitId(dept?.unitId || role.department?.unit?.id || '');
            setLoading(true);
            Promise.all([
                fetch(`${config_1.API_URL}/api/structure/roles/${role.id}/kit`).then(r => r.ok ? r.json() : null),
                fetch(`${config_1.API_URL}/api/tools`).then(r => r.ok ? r.json() : []),
                fetch(`${config_1.API_URL}/api/tools-and-levels`).then(r => r.ok ? r.json() : {})
            ]).then(([roleData, toolsList, levelsMap]) => {
                setKitItems(roleData?.kitItems?.map((it) => ({
                    toolCode: it.toolCode,
                    toolName: it.toolName,
                    accessLevelDesc: it.accessLevelDesc,
                    criticality: it.criticality,
                    isCritical: it.isCritical !== false
                })) || []);
                setTools(toolsList || []);
                setToolsAndLevelsMap(levelsMap || {});
            }).catch(e => console.error(e)).finally(() => setLoading(false));
        }
    }, [role?.id, role?.name, role?.code, role?.departmentId, departmentId, isOpen, isCreateMode, departments]);
    (0, react_1.useEffect)(() => {
        if (role) {
            setRoleName(role.name);
            setRoleCode(role.code || '');
        }
    }, [role?.name, role?.code]);
    // Ao trocar departamento, atualiza Unidade para a unidade do novo departamento
    (0, react_1.useEffect)(() => {
        if (selectedDepartmentId && selectedDept?.unitId && selectedUnitId !== selectedDept.unitId) {
            setSelectedUnitId(selectedDept.unitId);
        }
    }, [selectedDepartmentId, selectedDept?.unitId]);
    /** Normaliza nome para match: remove sigla entre parênteses e espaços extras (ex: "Clicsign (CS)" → "Clicsign") */
    const normalizeToolNameForMatch = (name) => (name || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
    const getLevelsForTool = (toolId) => {
        const t = tools.find(x => x.id === toolId);
        const toolName = (t?.name || '').trim();
        if (!toolName)
            return [];
        const map = toolsAndLevelsMap;
        const exact = map[toolName];
        if (exact && exact.length > 0)
            return exact;
        const normalized = normalizeToolNameForMatch(toolName).toLowerCase();
        if (!normalized)
            return [];
        const matchedKey = Object.keys(map).find((key) => normalizeToolNameForMatch(key).toLowerCase() === normalized);
        const levels = matchedKey ? map[matchedKey] : [];
        return Array.isArray(levels) && levels.length > 0 ? levels : [];
    };
    const addRow = () => {
        setKitItems([...kitItems, {
                toolCode: '',
                toolName: '',
                accessLevelDesc: null,
                criticality: null,
                isCritical: true
            }]);
    };
    const updateRow = (index, field, value) => {
        const next = [...kitItems];
        if (field === 'toolCode' && value) {
            const t = tools.find(x => x.id === value);
            const levels = getLevelsForTool(value);
            const firstLevel = levels[0];
            next[index] = {
                ...next[index],
                toolCode: value,
                toolName: t ? t.name : next[index].toolName,
                accessLevelDesc: firstLevel ? (typeof firstLevel === 'string' ? firstLevel : firstLevel.value) : null
            };
        }
        else {
            next[index][field] = value;
        }
        setKitItems(next);
    };
    const removeRow = (index) => {
        setKitItems(kitItems.filter((_, i) => i !== index));
    };
    const handleSave = async () => {
        const name = roleName.trim();
        if (!name) {
            showToast('Informe o nome do cargo.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const validItems = kitItems
                .filter(it => it.toolCode && it.toolName)
                .map(it => ({
                toolCode: it.toolCode,
                toolName: it.toolName,
                accessLevelDesc: it.accessLevelDesc || null,
                criticality: it.criticality || null,
                isCritical: it.isCritical !== false
            }));
            if (isCreateMode) {
                const deptId = selectedDepartmentId || departmentId;
                if (!deptId) {
                    showToast('Departamento não informado.', 'error');
                    setSaving(false);
                    return;
                }
                const res = await fetch(`${config_1.API_URL}/api/structure/roles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        code: roleCode.trim() || null,
                        departmentId: deptId,
                        kitItems: validItems
                    })
                });
                if (res.ok) {
                    showToast('Cargo criado com sucesso!', 'success');
                    onUpdate();
                    onClose();
                }
                else {
                    const err = await res.json();
                    showToast(err.error || 'Erro ao criar cargo.', 'error');
                }
            }
            else if (role) {
                const payload = {
                    name: name || role.name,
                    code: roleCode.trim() || null,
                    kitItems: validItems
                };
                if (selectedDepartmentId && selectedDepartmentId !== role.departmentId) {
                    payload.departmentId = selectedDepartmentId;
                }
                const res = await fetch(`${config_1.API_URL}/api/structure/roles/${role.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('Cargo e kit atualizados!', 'success');
                    onUpdate();
                    onClose();
                }
                else {
                    const err = await res.json();
                    showToast(err.error || 'Erro ao salvar cargo.', 'error');
                }
            }
        }
        catch (e) {
            showToast('Erro de conexão.', 'error');
        }
        setSaving(false);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '720px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "modal-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: isCreateMode ? 'Novo cargo e kit básico' : 'Editar cargo e kit básico' }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20 }) })] }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, overflowY: 'auto', paddingRight: 8 }, children: loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 24, color: '#71717a', textAlign: 'center' }, children: "Carregando..." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }, children: "Nome do cargo" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa' }, children: "C\u00F3digo (ex: KBS-BO-1)" }), (0, jsx_runtime_1.jsx)("input", { value: roleCode, onChange: e => setRoleCode(e.target.value), placeholder: "KBS-BO-1", className: "form-input", style: { width: '100%', marginTop: 4 } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa' }, children: "Nome" }), (0, jsx_runtime_1.jsx)("input", { value: roleName, onChange: e => setRoleName(e.target.value), placeholder: "Ex: CEO", className: "form-input", style: { width: '100%', marginTop: 4 } })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }, children: "Departamento e Unidade" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa' }, children: "Departamento" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedDepartmentId, onChange: e => setSelectedDepartmentId(e.target.value), className: "form-input", style: { width: '100%', marginTop: 4 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), departments.map(d => ((0, jsx_runtime_1.jsx)("option", { value: d.id, children: d.name }, d.id)))] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: { fontSize: 12, color: '#a1a1aa' }, children: "Unidade" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedUnitId, onChange: e => setSelectedUnitId(e.target.value), className: "form-input", style: { width: '100%', marginTop: 4 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), units.filter(u => !selectedDepartmentId || selectedDept?.unitId === u.id).map(u => ((0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.name }, u.id)))] })] })] }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 12, margin: '12px 0 0 0' }, children: "Ao alterar o departamento, todos os colaboradores deste cargo ser\u00E3o movidos junto." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-base", style: { background: '#18181b', border: '1px solid #27272a', marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { color: '#f4f4f5', margin: '0 0 12px 0', fontSize: 14 }, children: "Kit b\u00E1sico de ferramentas" }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#71717a', fontSize: 12, margin: '0 0 12px 0' }, children: "Selecione apenas ferramentas j\u00E1 cadastradas no Cat\u00E1logo. Novas ferramentas criadas no Cat\u00E1logo aparecem aqui automaticamente." }), (0, jsx_runtime_1.jsx)("div", { style: { overflowX: 'auto' }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #27272a', color: '#a1a1aa' }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '10px 8px', textAlign: 'left', width: '36%' }, children: "Ferramenta" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '10px 8px', textAlign: 'left', width: '28%' }, children: "N\u00EDvel de acesso" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '10px 8px', textAlign: 'left', width: '18%' }, children: "Criticidade" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '10px 8px', textAlign: 'left', width: '12%' }, children: "Cr\u00EDtico" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '10px 8px', width: 44 } })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: kitItems.map((item, index) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid #27272a' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '8px' }, children: (0, jsx_runtime_1.jsxs)("select", { value: item.toolCode, onChange: e => {
                                                                        const id = e.target.value;
                                                                        const t = tools.find(x => x.id === id);
                                                                        if (t)
                                                                            updateRow(index, 'toolCode', id);
                                                                    }, className: "form-input", style: { width: '100%', fontSize: 12, padding: '6px 8px' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione..." }), tools.map(t => ((0, jsx_runtime_1.jsxs)("option", { value: t.id, children: [t.name, t.acronym ? ` (${t.acronym})` : ''] }, t.id)))] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '8px' }, children: (0, jsx_runtime_1.jsxs)("select", { value: item.accessLevelDesc || '', onChange: e => updateRow(index, 'accessLevelDesc', e.target.value || null), disabled: !item.toolCode || getLevelsForTool(item.toolCode).length === 0, className: "form-input", style: { width: '100%', fontSize: 12, padding: '6px 8px' }, title: item.toolCode && getLevelsForTool(item.toolCode).length === 0 ? 'Nenhum nível mapeado para esta ferramenta' : undefined, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014" }), (item.toolCode ? getLevelsForTool(item.toolCode) : []).map(l => {
                                                                            const lab = typeof l === 'string' ? l : l.label;
                                                                            const val = typeof l === 'string' ? l : l.value;
                                                                            return (0, jsx_runtime_1.jsx)("option", { value: val, children: lab }, val);
                                                                        })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '8px' }, children: (0, jsx_runtime_1.jsxs)("select", { value: item.criticality || '', onChange: e => updateRow(index, 'criticality', e.target.value || null), className: "form-input", style: { width: '100%', fontSize: 12, padding: '6px 8px' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014" }), (0, jsx_runtime_1.jsx)("option", { value: "Alta", children: "Alta" }), (0, jsx_runtime_1.jsx)("option", { value: "M\u00E9dia", children: "M\u00E9dia" }), (0, jsx_runtime_1.jsx)("option", { value: "Baixa", children: "Baixa" })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '8px' }, children: (0, jsx_runtime_1.jsxs)("select", { value: item.isCritical ? 'Sim' : 'Não', onChange: e => updateRow(index, 'isCritical', e.target.value === 'Sim'), className: "form-input", style: { width: '100%', fontSize: 12, padding: '6px 8px' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "Sim", children: "Sim" }), (0, jsx_runtime_1.jsx)("option", { value: "N\u00E3o", children: "N\u00E3o" })] }) }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '8px' }, children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeRow(index), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }) }) })] }, index))) })] }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: addRow, className: "btn-mini", style: { marginTop: 10 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { size: 14, style: { marginRight: 6 } }), " Adicionar ferramenta"] })] }), !isCreateMode && role && ((0, jsx_runtime_1.jsx)(EntityAuditHistory_1.EntityAuditHistory, { entidadeId: role.id, entidadeTipo: "Role", limit: 5, onOpenFullHistory: onOpenAuditHistory ? (p) => onOpenAuditHistory(p.entidadeId, p.entidadeTipo) : undefined }))] })) }), (0, jsx_runtime_1.jsxs)("div", { style: { padding: 16, borderTop: '1px solid #27272a', display: 'flex', gap: 10, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "btn-verify", style: { background: 'transparent', border: '1px solid #374151', color: '#9CA3AF' }, children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, disabled: saving || loading, className: "btn-verify", children: saving ? 'Salvando...' : 'Salvar' })] })] }) }));
};
exports.EditRoleKitModal = EditRoleKitModal;
