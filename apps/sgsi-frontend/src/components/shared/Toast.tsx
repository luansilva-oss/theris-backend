import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface Props {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={16} color="#22c55e" />,
  error:   <XCircle size={16} color="#ef4444" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
};

const colors = {
  success: '#22c55e',
  error:   '#ef4444',
  warning: '#f59e0b',
};

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300"
      style={{
        background: 'var(--color-surface)',
        borderColor: colors[toast.type] + '44',
        color: 'var(--color-text)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {icons[toast.type]}
      <span className="text-sm flex-1">{toast.message}</span>
      <button onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="hover:opacity-60 transition-opacity shrink-0"
        style={{ color: 'var(--color-text-muted)' }}>
        <X size={14} />
      </button>
    </div>
  );
}
