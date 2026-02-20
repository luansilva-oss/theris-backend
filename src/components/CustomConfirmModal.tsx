import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export const CustomConfirmModal: React.FC<Props> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content fade-in" style={{ maxWidth: '400px', border: isDestructive ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(124, 58, 237, 0.2)' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isDestructive && <AlertTriangle size={20} color="#ef4444" />}
                        <h2 style={{ fontSize: '18px', margin: 0 }}>{title}</h2>
                    </div>
                    <button onClick={onCancel} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '20px 0', color: '#a1a1aa', fontSize: '14px', lineHeight: 1.5 }}>
                    {message}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <button
                        className="btn-verify"
                        style={{
                            flex: 1,
                            margin: 0,
                            background: isDestructive ? '#ef4444' : '#7c3aed',
                            color: 'white'
                        }}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        className="btn-verify"
                        style={{
                            flex: 1,
                            margin: 0,
                            background: 'transparent',
                            border: '1px solid #3f3f46',
                            color: '#d4d4d8'
                        }}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
