import { AlertTriangle } from 'lucide-react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }: Props) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}>
      <div className="rounded-xl p-6 w-full max-w-sm border shadow-xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={20} color={danger ? '#ef4444' : '#f59e0b'} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Confirmação</h3>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="text-sm px-4 py-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-lg font-medium hover:opacity-80"
            style={{ background: danger ? '#ef4444' : 'var(--color-primary)', color: '#fff' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
