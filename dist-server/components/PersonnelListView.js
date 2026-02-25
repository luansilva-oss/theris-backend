"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonnelListView = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const UNIT_ORDER = ['3C+', 'Evolux', 'Dizify', 'Instituto 3C', 'FiqOn', 'Dizparos'];
const PersonnelListView = ({ units: unitsFromApi, users, departments, roles, onEditUser, onDeleteUser, onEditDepartment, onDeleteDepartment, onEditRole }) => {
    const [expandedUnits, setExpandedUnits] = (0, react_1.useState)({});
    const [expandedDepts, setExpandedDepts] = (0, react_1.useState)({});
    const [expandedRoles, setExpandedRoles] = (0, react_1.useState)({});
    const toggleUnit = (key) => setExpandedUnits(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleDept = (key) => setExpandedDepts(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleRole = (key) => setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));
    // Fonte única: estrutura vem só da API (seed_units). Não derivar unidades dos usuários.
    const unitList = react_1.default.useMemo(() => {
        const list = Array.isArray(unitsFromApi) ? unitsFromApi.filter((u) => u.name !== 'Geral') : [];
        if (list.length === 0)
            return [];
        return UNIT_ORDER.filter(name => list.some((u) => u.name === name))
            .concat(list.filter((u) => !UNIT_ORDER.includes(u.name)).map((u) => u.name))
            .map(unitName => {
            const apiUnit = list.find((u) => u.name === unitName);
            return apiUnit ? { name: unitName, departments: apiUnit.departments || [] } : { name: unitName, departments: [] };
        });
    }, [unitsFromApi]);
    const matchUserToUnit = (u, unitName) => (u.unit || '').trim() === unitName;
    const getUsersByUnitDeptJob = (unitName, dept, jobTitle) => users.filter(u => matchUserToUnit(u, unitName) && u.department === dept && (u.jobTitle || '').trim() === jobTitle);
    const findDepartment = (name) => departments.find(d => d.name === name);
    const findRole = (deptName, roleName) => roles.find(r => r.name === roleName && (r.department?.name === deptName));
    return ((0, jsx_runtime_1.jsx)("div", { className: "personnel-list-view", style: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 24 }, children: unitList.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, textAlign: 'center', background: '#18181b', borderRadius: 12, color: '#a1a1aa', fontSize: 14, lineHeight: 1.6 }, children: ["Estrutura n\u00E3o carregada. No deploy s\u00E3o executados ", (0, jsx_runtime_1.jsx)("strong", { children: "seed_units" }), " e ", (0, jsx_runtime_1.jsx)("strong", { children: "seed_gestao_por_unidade" }), "; ap\u00F3s isso, aqui aparecer\u00E3o as 6 unidades (3C+, Evolux, Dizify, Instituto 3C, FiqOn, Dizparos) com departamentos, cargos e colaboradores."] })) : unitList.map(({ name: unitName, departments: unitDepts }) => {
            const usersInUnit = users.filter(u => matchUserToUnit(u, unitName));
            const deptList = unitDepts.length > 0
                ? unitDepts
                : [...new Set(usersInUnit.map(u => u.department).filter(Boolean))].map((d) => ({ id: '', name: d, roles: roles.filter((r) => r.department?.name === d) }));
            const unitKey = `unit-${unitName}`;
            return ((0, jsx_runtime_1.jsxs)("div", { style: { border: '1px solid #1f1f22', borderRadius: '12px', overflow: 'hidden', background: '#09090b' }, children: [(0, jsx_runtime_1.jsxs)("div", { onClick: () => toggleUnit(unitKey), style: {
                            padding: '16px 20px',
                            background: '#18181b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderBottom: expandedUnits[unitKey] ? '1px solid #1f1f22' : 'none'
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building2, { size: 22, color: "#8b5cf6" }), (0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 700, color: '#f4f4f5', fontSize: '16px' }, children: ["UNIDADE: ", unitName] })] }), expandedUnits[unitKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 20, color: "#71717a" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 20, color: "#71717a" })] }), expandedUnits[unitKey] && ((0, jsx_runtime_1.jsx)("div", { style: { padding: '12px 16px 16px', background: '#09090b' }, children: deptList.map((dept) => {
                            const deptName = dept.name;
                            const usersInDept = usersInUnit.filter(u => u.department === deptName);
                            const jobTitles = (dept.roles && dept.roles.length > 0)
                                ? dept.roles.map((r) => r.name)
                                : [...new Set(usersInDept.map(u => (u.jobTitle || '').trim()).filter(Boolean))];
                            const deptKey = `${unitKey}-${deptName}`;
                            const deptEntity = findDepartment(deptName);
                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, border: '1px solid #27272a', borderRadius: '10px', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                            padding: '12px 16px',
                                            background: '#18181b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            borderBottom: expandedDepts[deptKey] ? '1px solid #27272a' : 'none'
                                        }, onClick: () => toggleDept(deptKey), children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontWeight: 600, color: '#e4e4e7', fontSize: '14px' }, children: ["\uD83D\uDCC2 Departamento: ", deptName] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [deptEntity && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onEditDepartment(deptEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }, title: "Editar departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { size: 14, color: "#71717a" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteDepartment(deptEntity); }, style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }, title: "Excluir departamento", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) })] })), expandedDepts[deptKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 18, color: "#52525b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 18, color: "#52525b" })] })] }), expandedDepts[deptKey] && ((0, jsx_runtime_1.jsx)("div", { style: { padding: '8px 12px 12px 24px', background: '#09090b' }, children: jobTitles.map((jobTitle) => {
                                            const roleUsers = getUsersByUnitDeptJob(unitName, deptName, jobTitle);
                                            const roleEntity = findRole(deptName, jobTitle);
                                            const roleKey = `${deptKey}-${jobTitle}`;
                                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8, border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                                            padding: '10px 14px',
                                                            background: '#18181b',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            borderBottom: expandedRoles[roleKey] ? '1px solid #27272a' : 'none'
                                                        }, onClick: () => toggleRole(roleKey), children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 16, color: "#71717a" }), (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 500, color: '#e4e4e7', fontSize: '13px' }, children: jobTitle })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [onEditRole && roleEntity && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onEditRole(roleEntity); }, title: "Editar kit do cargo", style: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { size: 14, color: "#a78bfa" }) })), expandedRoles[roleKey] ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16, color: "#52525b" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 16, color: "#52525b" })] })] }), expandedRoles[roleKey] && ((0, jsx_runtime_1.jsx)("div", { style: { padding: '4px 0', background: '#09090b' }, children: roleUsers.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '10px 14px 10px 38px', color: '#52525b', fontSize: '12px', fontStyle: 'italic' }, children: "Nenhum colaborador." })) : (roleUsers.map(user => ((0, jsx_runtime_1.jsxs)("div", { onClick: () => onEditUser(user), style: {
                                                                padding: '10px 14px 10px 38px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #1f1f22',
                                                                transition: 'background 0.2s'
                                                            }, onMouseOver: (e) => (e.currentTarget.style.background = '#18181b'), onMouseOut: (e) => (e.currentTarget.style.background = 'transparent'), children: [(0, jsx_runtime_1.jsx)("div", { style: { width: '28px', height: '28px', borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }, children: user.name.charAt(0) }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, fontSize: '13px', color: '#e4e4e7' }, children: [user.name, " ", (0, jsx_runtime_1.jsx)("span", { style: { color: '#71717a' }, children: "|" }), " ", user.email] }), onDeleteUser && ((0, jsx_runtime_1.jsx)("button", { onClick: (e) => { e.stopPropagation(); onDeleteUser(user); }, title: "Excluir colaborador", style: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4 }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14, color: "#ef4444" }) }))] }, user.id)))) }))] }, roleKey));
                                        }) }))] }, deptKey));
                        }) }))] }, unitKey));
        }) }));
};
exports.PersonnelListView = PersonnelListView;
exports.default = exports.PersonnelListView;
