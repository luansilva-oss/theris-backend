"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalObservacao = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ModalObservacao = ({ isOpen, onClose, onConfirm, titulo, tipo }) => {
    const [observacao, setObservacao] = (0, react_1.useState)('');
    // Limpa o campo sempre que abre
    (0, react_1.useEffect)(() => {
        if (isOpen)
            setObservacao('');
    }, [isOpen]);
    if (!isOpen)
        return null;
    return (
    // 1. OVERLAY (Fundo Escuro que cobre a tela toda)
    (0, jsx_runtime_1.jsx)("div", { style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)', // Escurece o fundo
            backdropFilter: 'blur(4px)', // Efeito de vidro (blur)
            zIndex: 9999, // Garante que fica por cima de TUDO
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                backgroundColor: '#111827', // Cor de fundo escura (Dark theme)
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '12px' }, children: (0, jsx_runtime_1.jsx)("h3", { style: {
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'white'
                        }, children: titulo }) }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '24px' }, children: [(0, jsx_runtime_1.jsx)("label", { style: { display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '8px' }, children: "Observa\u00E7\u00E3o (Opcional):" }), (0, jsx_runtime_1.jsx)("textarea", { style: {
                                width: '100%',
                                backgroundColor: '#1F2937',
                                color: 'white',
                                border: '1px solid #4B5563',
                                borderRadius: '8px',
                                padding: '12px',
                                minHeight: '100px',
                                resize: 'none',
                                outline: 'none',
                                fontSize: '14px',
                                fontFamily: "'Inter', sans-serif"
                            }, placeholder: tipo === 'reprovar' ? "Digite o motivo da reprovação (Obrigatório)..." :
                                tipo === 'pendente' ? "Descreva o que falta ou por que está pendente..." :
                                    "Alguma observação adicional?...", value: observacao, onChange: (e) => setObservacao(e.target.value), autoFocus: true })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: onClose, style: {
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                color: '#D1D5DB',
                                border: '1px solid #4B5563',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.875rem'
                            }, onMouseOver: (e) => e.currentTarget.style.backgroundColor = '#374151', onMouseOut: (e) => e.currentTarget.style.backgroundColor = 'transparent', children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onConfirm(observacao), style: {
                                padding: '8px 16px',
                                backgroundColor: tipo === 'aprovar' ? '#059669' : tipo === 'reprovar' ? '#DC2626' : '#D97706', // Verde, Vermelho ou Âmbar
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                transition: 'background-color 0.2s'
                            }, onMouseOver: (e) => e.currentTarget.style.backgroundColor = tipo === 'aprovar' ? '#047857' : tipo === 'reprovar' ? '#B91C1C' : '#B45309', onMouseOut: (e) => e.currentTarget.style.backgroundColor = tipo === 'aprovar' ? '#059669' : tipo === 'reprovar' ? '#DC2626' : '#D97706', children: "Confirmar" })] })] }) }));
};
exports.ModalObservacao = ModalObservacao;
