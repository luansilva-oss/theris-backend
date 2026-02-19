"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("@xyflow/react");
const lucide_react_1 = require("lucide-react");
const PersonNode = ({ data }) => {
    const { name, email, jobTitle, department, isRoot, level, onEdit } = data;
    // Esquema de cores dark premium baseado no departamento
    const getColors = () => {
        const dept = department?.toLowerCase() || '';
        if (isRoot)
            return {
                bg: 'rgba(251, 191, 36, 0.15)',
                border: '#fbbf24',
                accent: '#fbbf24',
                text: '#fbbf24',
                gradient: 'linear-gradient(135deg, #18181b 0%, #422006 100%)'
            };
        if (dept.includes('comercial') || dept.includes('vendas'))
            return {
                bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', accent: '#10b981', text: '#34d399',
                gradient: 'linear-gradient(135deg, #18181b 0%, #064e3b 100%)'
            };
        if (dept.includes('produto') || dept.includes('tecnologia') || dept.includes('it'))
            return {
                bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', accent: '#3b82f6', text: '#60a5fa',
                gradient: 'linear-gradient(135deg, #18181b 0%, #172554 100%)'
            };
        if (dept.includes('pessoas') || dept.includes('rh') || dept.includes('performance'))
            return {
                bg: 'rgba(244, 114, 182, 0.15)', border: '#f472b6', accent: '#f472b6', text: '#fb923c',
                gradient: 'linear-gradient(135deg, #18181b 0%, #831843 100%)'
            };
        if (dept.includes('financeiro') || dept.includes('contabil'))
            return {
                bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', accent: '#8b5cf6', text: '#a78bfa',
                gradient: 'linear-gradient(135deg, #18181b 0%, #2e1065 100%)'
            };
        if (dept.includes('marketing') || dept.includes('growth'))
            return {
                bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', accent: '#ef4444', text: '#fca5a5',
                gradient: 'linear-gradient(135deg, #18181b 0%, #7f1d1d 100%)'
            };
        // Padrão: Lilás Escuro/Dark Lilac
        return {
            bg: 'rgba(167, 139, 250, 0.1)', border: '#4c1d95', accent: '#7c3aed', text: '#a78bfa',
            gradient: 'linear-gradient(135deg, #0f172a 0%, #2e1065 100%)'
        };
    };
    const colors = getColors();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "person-node", style: {
            background: colors.gradient,
            border: `1px solid ${colors.border}44`,
            borderLeft: `3px solid ${colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            minWidth: '240px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }, children: [(0, jsx_runtime_1.jsx)(react_2.Handle, { type: "target", position: react_2.Position.Top, style: {
                    background: colors.accent,
                    width: '8px',
                    height: '8px',
                    border: '2px solid #09090b',
                    top: '-4px'
                } }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center rounded-lg text-sm font-bold shadow-inner", style: {
                                    width: '32px',
                                    height: '32px',
                                    background: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}66`
                                }, children: name.charAt(0) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onEdit?.({ id: data.id, name, email, jobTitle, department }), className: "p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all shadow-sm", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit2, { size: 14 }) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 4 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { color: 'white', fontWeight: 700, fontSize: '15px', marginBottom: 2 }, children: name }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", style: { color: '#a1a1aa', fontSize: '12px' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { size: 12, className: "shrink-0" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: jobTitle || 'Sem Cargo' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5 mt-2 pt-2 border-t border-white/5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", style: { fontSize: '11px', color: '#71717a' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Building, { size: 11, className: "shrink-0" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: department || 'Geral' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", style: { fontSize: '11px', color: '#71717a' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { size: 11, className: "shrink-0" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: email })] })] })] }), (0, jsx_runtime_1.jsx)(react_2.Handle, { type: "source", position: react_2.Position.Bottom, style: {
                    background: colors.accent,
                    width: '10px',
                    height: '10px',
                    border: '2px solid #09090b',
                    bottom: '-5px'
                } })] }));
};
exports.default = (0, react_1.memo)(PersonNode);
