import { X, AlertTriangle } from 'lucide-react';

interface CustomConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export const CustomConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    isDestructive = false
}: CustomConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '400px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDestructive ? '#ef4444' : '#a78bfa'
                        }}>
                            <AlertTriangle size={20} />
                        </div>
                        <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h3>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} color="#71717a" />
                    </button>
                </div>

                <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', margin: '0 0 24px 0' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn-text"
                        style={{ padding: '10px 20px', fontSize: '14px' }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background: isDestructive ? '#ef4444' : '#7c3aed',
                            color: 'white',
                            transition: 'all 0.2s'
                        }}
                        className={isDestructive ? 'hover:bg-red-600' : 'hover:bg-violet-700'}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
