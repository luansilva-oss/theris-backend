import React, { useState, useEffect } from 'react';

interface ModalObservacaoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (observacao: string) => void;
    titulo: string;
    tipo: 'aprovar' | 'reprovar'; // Para mudar a cor do botão
}

export const ModalObservacao: React.FC<ModalObservacaoProps> = ({
    isOpen,
    onClose,
    onConfirm,
    titulo,
    tipo
}) => {
    const [observacao, setObservacao] = useState('');

    // Limpa o campo sempre que o modal abre
    useEffect(() => {
        if (isOpen) setObservacao('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        // Fundo escuro com transparência (Overlay)
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">

            {/* Container do Modal */}
            <div className="w-full max-w-md bg-[#111827] border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">

                {/* Cabeçalho */}
                <div className="bg-[#1F2937] px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">{titulo}</h3>
                </div>

                {/* Corpo */}
                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Observação (Opcional)
                    </label>
                    <textarea
                        className="w-full h-32 bg-[#374151] text-white border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none placeholder-gray-500"
                        placeholder="Digite o motivo ou uma observação..."
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Rodapé (Botões) */}
                <div className="bg-[#1F2937] px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={() => onConfirm(observacao)}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-lg ${tipo === 'aprovar'
                                ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20'
                                : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
                            }`}
                    >
                        Confirmar {tipo === 'aprovar' ? 'Aprovação' : 'Reprovação'}
                    </button>
                </div>
            </div>
        </div>
    );
};