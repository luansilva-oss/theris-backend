import type { ActionStatus, ActionFrequency } from './api';

export const frequencyLabels: Record<ActionFrequency, string> = {
  DAILY:      'Diário',
  WEEKLY:     'Semanal',
  BIWEEKLY:   'Quinzenal',
  MONTHLY:    'Mensal',
  QUARTERLY:  'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL:     'Anual',
  ON_DEMAND:  'Conforme Demanda',
};

export const typeLabels: Record<string, string> = {
  MEETING:  'Reunião/Ação',
  REVIEW:   'Revisão',
  AUDIT:    'Auditoria',
  TRAINING: 'Treinamento',
  ACTIVITY: 'Atividade',
  REPORT:   'Relatório',
};

export const statusLabels: Record<ActionStatus, string> = {
  SCHEDULED:   'Agendada',
  DUE_SOON:    'Vence em breve',
  IN_PROGRESS: 'Em andamento',
  OVERDUE:     'Atrasada',
  COMPLETED:   'Concluída',
};
