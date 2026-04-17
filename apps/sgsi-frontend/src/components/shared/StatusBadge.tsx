import type { ActionStatus, ChangeStatus } from '../../lib/api';

const actionLabels: Record<ActionStatus, string> = {
  SCHEDULED:   'Agendada',
  DUE_SOON:    'Vence em breve',
  IN_PROGRESS: 'Em andamento',
  OVERDUE:     'Atrasada',
  COMPLETED:   'Concluída',
};

const actionColors: Record<ActionStatus, string> = {
  SCHEDULED:   '#3b82f6',
  DUE_SOON:    '#f59e0b',
  IN_PROGRESS: '#8b5cf6',
  OVERDUE:     '#ef4444',
  COMPLETED:   '#22c55e',
};

const changeLabelMap: Record<ChangeStatus, string> = {
  OPEN:              'Aberta',
  MEETING_SCHEDULED: 'Reunião agendada',
  DECISION_RECORDED: 'Decisão registrada',
  CLOSED:            'Encerrada',
};

const changeColorMap: Record<ChangeStatus, string> = {
  OPEN:              '#ef4444',
  MEETING_SCHEDULED: '#f59e0b',
  DECISION_RECORDED: '#3b82f6',
  CLOSED:            '#22c55e',
};

interface Props {
  status: ActionStatus | ChangeStatus;
  type?: 'action' | 'change';
}

export function StatusBadge({ status, type = 'action' }: Props) {
  const label = type === 'action'
    ? actionLabels[status as ActionStatus]
    : changeLabelMap[status as ChangeStatus];
  const color = type === 'action'
    ? actionColors[status as ActionStatus]
    : changeColorMap[status as ChangeStatus];

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color }}>
      {label}
    </span>
  );
}
