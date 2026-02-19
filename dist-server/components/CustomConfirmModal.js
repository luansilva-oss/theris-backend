"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomConfirmModal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const CustomConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', isDestructive = false }) => {
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "modal-overlay", style: { zIndex: 10000 }, children: (0, jsx_runtime_1.jsxs)("div", { className: "modal-content", style: { maxWidth: '400px', padding: '24px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isDestructive ? '#ef4444' : '#a78bfa'
                                    }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { size: 20 }) }), (0, jsx_runtime_1.jsx)("h3", { style: { color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }, children: title })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 20, color: "#71717a" }) })] }), (0, jsx_runtime_1.jsx)("p", { style: { color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', margin: '0 0 24px 0' }, children: message }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '12px', justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "btn-text", style: { padding: '10px 20px', fontSize: '14px' }, children: cancelLabel }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                onConfirm();
                                onClose();
                            }, style: {
                                padding: '10px 20px',
                                fontSize: '14px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                background: isDestructive ? '#ef4444' : '#7c3aed',
                                color: 'white',
                                transition: 'all 0.2s'
                            }, className: isDestructive ? 'hover:bg-red-600' : 'hover:bg-violet-700', children: confirmLabel })] })] }) }));
};
exports.CustomConfirmModal = CustomConfirmModal;
