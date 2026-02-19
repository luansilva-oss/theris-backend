import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'none'
        }}>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', icon: <CheckCircle size={18} color="#34d399" /> },
        error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', icon: <XCircle size={18} color="#f87171" /> },
        warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', icon: <AlertTriangle size={18} color="#fbbf24" /> },
        info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', icon: <Info size={18} color="#60a5fa" /> }
    };

    const style = colors[toast.type];

    return (
        <div style={{
            minWidth: '300px',
            maxWidth: '450px',
            background: '#18181b',
            borderLeft: `4px solid ${style.border}`,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: '16px',
            display: 'flex',
            alignItems: 'start',
            gap: '12px',
            pointerEvents: 'auto',
            animation: isExiting ? 'toast-out 0.3s ease-in forwards' : 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{ marginTop: '2px' }}>{style.icon}</div>
            <div style={{ flex: 1, color: '#e4e4e7', fontSize: '14px', fontWeight: 500, lineHeight: '1.4' }}>
                {toast.message}
            </div>
            <button
                onClick={handleClose}
                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px', display: 'flex' }}
                className="hover:text-white"
            >
                <X size={16} />
            </button>
            <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
        </div>
    );
};
