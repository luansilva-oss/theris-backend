interface Props {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📭' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3"
      style={{ color: 'var(--color-text-muted)' }}>
      <span className="text-4xl">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
