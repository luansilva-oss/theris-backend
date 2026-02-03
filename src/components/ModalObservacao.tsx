import React, { useState, useEffect } from 'react';

interface ModalObservacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (observacao: string) => void;
    titulo: string;
    tipo: 'aprovar' | 'reprovar';
}

export const ModalObservacao: React.FC<ModalObservacaoProps> = ({
    isOpen,
    onClose,
    onConfirm,
    titulo,
    tipo
}) => {
    const [observacao, setObservacao] = useState('');

    // Limpa o campo sempre que abre
    useEffect(() => {
        if (isOpen) setObservacao('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        // 1. OVERLAY (Fundo Escuro que cobre a tela toda)
        <div style={{
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
        }}>

            {/* 2. A CAIXA DO MODAL */}
            <div style={{
                backgroundColor: '#111827', // Cor de fundo escura (Dark theme)
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.2s ease-out'
            }}>

                {/* Cabeçalho */}
                <div style={{ marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'white'
                    }}>
                        {titulo}
                    </h3>
                </div>

                {/* Corpo */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '8px' }}>
                        Observação (Opcional):
                    </label>
                    <textarea
                        style={{
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
                            fontFamily: 'inherit'
                        }}
                        placeholder={tipo === 'reprovar' ? "Digite o motivo da reprovação (Obrigatório)..." : "Alguma observação adicional?..."}
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Rodapé (Botões) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#D1D5DB',
                            border: '1px solid #4B5563',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.875rem'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={() => onConfirm(observacao)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: tipo === 'aprovar' ? '#059669' : '#DC2626', // Verde ou Vermelho
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = tipo === 'aprovar' ? '#047857' : '#B91C1C'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = tipo === 'aprovar' ? '#059669' : '#DC2626'}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};