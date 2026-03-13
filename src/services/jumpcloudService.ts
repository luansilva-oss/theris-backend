/**
 * Integração JumpCloud: Directory Insights (eventos Password Manager) e System Users (expiração de senha).
 * Notificações Slack via canal JUMPCLOUD_SLACK_CHANNEL_ID e DMs.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JUMPCLOUD_API_KEY = process.env.JUMPCLOUD_API_KEY || '';
const JUMPCLOUD_SLACK_CHANNEL_ID = process.env.JUMPCLOUD_SLACK_CHANNEL_ID || '';
/** POST https://api.jumpcloud.com/insights/directory/v1/events — Directory Insights API */
const INSIGHTS_EVENTS_URL = 'https://api.jumpcloud.com/insights/directory/v1/events';
const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';

const CONFIG_KEY_LAST_PASSWORD_EVENT_TS = 'jumpcloud_password_events_last_start';

/** Valor do campo service para eventos do Password Manager (documentação JumpCloud: "Password Manager" na UI). */
const INSIGHTS_SERVICE_PASSWORD_MANAGER = 'password_manager';

/** Tipos de evento do Password Manager que processamos e notificamos no Slack. */
const RELEVANT_EVENT_TYPES = [
  'passwordmanager_item_copy',
  'passwordmanager_item_reveal',
];

/** Evento retornado pela API Directory Insights (estrutura flexível). */
export type JumpCloudInsightEvent = {
  id?: string;
  event_type?: string;
  action?: string;
  user_email?: string;
  email?: string;
  resource_name?: string;
  resource?: string;
  client_ip?: string;
  ip?: string;
  timestamp?: string;
  [k: string]: unknown;
};

/** Resposta da API de eventos (array de eventos). */
type InsightsEventsResponse = { events?: JumpCloudInsightEvent[]; data?: JumpCloudInsightEvent[] };

/**
 * Retorna o último timestamp processado (ISO string) ou null.
 */
export async function getLastProcessedEventTimestamp(): Promise<string | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY_LAST_PASSWORD_EVENT_TS },
      select: { value: true }
    });
    return row?.value ?? null;
  } catch (e) {
    console.error('[JumpCloud] getLastProcessedEventTimestamp:', e);
    return null;
  }
}

/**
 * Persiste o timestamp do último evento processado para a próxima execução do cron.
 */
export async function setLastProcessedEventTimestamp(isoTimestamp: string): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY_LAST_PASSWORD_EVENT_TS },
      create: { key: CONFIG_KEY_LAST_PASSWORD_EVENT_TS, value: isoTimestamp },
      update: { value: isoTimestamp }
    });
    console.log('[JumpCloud] Timestamp salvo:', isoTimestamp);
  } catch (e) {
    console.error('[JumpCloud] setLastProcessedEventTimestamp:', e);
  }
}

/** Mascara API key para log (mostra só os primeiros 6 caracteres). */
function maskApiKey(key: string): string {
  if (!key || key.length <= 6) return '***';
  return key.slice(0, 6) + '***';
}

/**
 * Consulta eventos do Password Manager (passwordmanager_item_copy e passwordmanager_item_reveal).
 * start_time: ISO timestamp do último evento processado; na primeira execução usar há 24h ou valor padrão.
 */
export async function fetchPasswordManagerEvents(startTime: string): Promise<JumpCloudInsightEvent[]> {
  if (!JUMPCLOUD_API_KEY) {
    console.error('[JumpCloud] JUMPCLOUD_API_KEY não configurada.');
    return [];
  }
  try {
    const endTime = new Date().toISOString();
    const body = {
      service: [INSIGHTS_SERVICE_PASSWORD_MANAGER],
      start_time: startTime,
      end_time: endTime
    };
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': JUMPCLOUD_API_KEY
    };

    console.log('[JumpCloud] URL completa:', INSIGHTS_EVENTS_URL);
    console.log('[JumpCloud] Headers:', { 'Content-Type': headers['Content-Type'], 'x-api-key': maskApiKey(JUMPCLOUD_API_KEY) });
    console.log('[JumpCloud] Body completo:', JSON.stringify(body, null, 2));
    console.log('[JumpCloud] Request interval start_time:', startTime, 'end_time:', endTime);

    const res = await fetch(INSIGHTS_EVENTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.error('[JumpCloud] Insights API status:', res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as InsightsEventsResponse;
    console.log('[JumpCloud] Response:', JSON.stringify(data, null, 2));
    const events = data.events ?? data.data ?? [];
    const list = Array.isArray(events) ? events : [];
    const filtered = list.filter((e) => RELEVANT_EVENT_TYPES.includes((e.event_type ?? '') as string));
    console.log('[JumpCloud] Parsed events count:', list.length, '| filtrados (copy/reveal):', filtered.length, '(keys in response:', Object.keys(data).join(', ') + ')');

    return filtered;
  } catch (e) {
    console.error('[JumpCloud] fetchPasswordManagerEvents:', e);
    return [];
  }
}

/**
 * Verifica se o evento já foi processado (evita duplicidade).
 */
export async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const existing = await prisma.jumpCloudEventLog.findUnique({
      where: { id: eventId },
      select: { id: true }
    });
    return !!existing;
  } catch (e) {
    console.error('[JumpCloud] isEventAlreadyProcessed:', e);
    return true; // em caso de erro, não processar de novo
  }
}

/**
 * Registra evento no log e retorna true se inserido (novo).
 */
export async function recordEventIfNew(event: JumpCloudInsightEvent): Promise<boolean> {
  const eventId = event.id ?? (event as any)._id;
  if (!eventId || typeof eventId !== 'string') return false;
  const eventType = (event.event_type ?? event.action ?? '').toString();
  const userEmail = (event.user_email ?? event.email ?? '').toString();
  const resourceName = (event.resource_name ?? event.resource ?? null) != null
    ? String(event.resource_name ?? event.resource)
    : null;
  const clientIp = (event.client_ip ?? event.ip ?? null) != null
    ? String(event.client_ip ?? event.ip)
    : null;

  try {
    await prisma.jumpCloudEventLog.create({
      data: {
        id: eventId,
        eventType,
        userEmail,
        resourceName,
        clientIp
      }
    });
    return true;
  } catch (e: any) {
    if (e?.code === 'P2002') return false; // unique constraint = já existe
    console.error('[JumpCloud] recordEventIfNew:', e);
    return false;
  }
}

/**
 * Envia notificação Slack para o canal de segurança (evento Password Manager).
 */
export async function notifyPasswordEventToSlack(event: JumpCloudInsightEvent): Promise<void> {
  if (!JUMPCLOUD_SLACK_CHANNEL_ID) return;
  const { getSlackApp } = await import('./slackService');
  const app = getSlackApp();
  if (!app?.client) return;

  const eventType = (event.event_type ?? event.action ?? '').toString().toLowerCase();
  const isView = eventType.includes('view') || eventType.includes('reveal') || eventType === 'password_view' || eventType === 'passwordmanager_item_reveal';
  const actionEmoji = isView ? '🔍' : '📋';
  const actionLabel = isView ? 'Senha Visualizada' : 'Senha Copiada';

  const userEmail = (event.user_email ?? event.email ?? '—').toString();
  const resourceName = (event.resource_name ?? event.resource ?? '—').toString();
  const clientIp = (event.client_ip ?? event.ip ?? '—').toString();
  const rawTs = event.timestamp ?? (event as any).timestamp_iso ?? new Date().toISOString();
  let timestampFormatted = '—';
  try {
    const d = new Date(rawTs);
    timestampFormatted = d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (_) {}

  const text =
    `🔐 *Monitoramento de Credenciais — JumpCloud*\n\n` +
    `Ação: [${actionEmoji} ${actionLabel}]\n` +
    `👤 Usuário: ${userEmail}\n` +
    `🛠️ Recurso: ${resourceName}\n` +
    `🕒 Horário: ${timestampFormatted}\n` +
    `🌐 IP de Origem: ${clientIp}`;

  try {
    await app.client.chat.postMessage({ channel: JUMPCLOUD_SLACK_CHANNEL_ID, text });
  } catch (e) {
    console.error('[JumpCloud] notifyPasswordEventToSlack:', e);
  }
}

// --- Password Expiry (System Users) ---

/** Usuário JumpCloud com data de expiração de senha. */
export type JumpCloudUserExpiry = {
  id: string;
  email?: string;
  username?: string;
  password_expiration_date?: string;
  [k: string]: unknown;
};

/**
 * Retorna usuários com senha expirando nos próximos 7 dias.
 * GET /api/systemusers com filtro password_expiration_date.
 */
export async function fetchUsersWithPasswordExpiring(daysAhead: number = 7): Promise<JumpCloudUserExpiry[]> {
  if (!JUMPCLOUD_API_KEY) {
    console.error('[JumpCloud] JUMPCLOUD_API_KEY não configurada.');
    return [];
  }
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);
  const filterDate = endDate.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const url = `${SYSTEM_USERS_URL}?limit=100&filter=password_expiration_date:$lt:${filterDate}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': JUMPCLOUD_API_KEY }
    });
    if (!res.ok) {
      console.error('[JumpCloud] System Users API status:', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
    return list.filter(
      (u: JumpCloudUserExpiry) => u.password_expiration_date && new Date(u.password_expiration_date) > new Date()
    );
  } catch (e) {
    console.error('[JumpCloud] fetchUsersWithPasswordExpiring:', e);
    return [];
  }
}

/**
 * Envia DM ao usuário no Slack (aviso de expiração de senha).
 */
export async function sendPasswordExpiryDm(slackUserId: string, userName: string, expiryDate: Date, daysLeft: number): Promise<void> {
  const { getSlackApp } = await import('./slackService');
  const app = getSlackApp();
  if (!app?.client) return;

  const expiryFormatted = expiryDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const text =
    `🔑 *Aviso de Expiração de Senha — JumpCloud*\n\n` +
    `Olá, *${userName}*! Sua senha do JumpCloud está prestes a expirar.\n\n` +
    `📅 Data de expiração: ${expiryFormatted}\n` +
    `⏳ Dias restantes: ${daysLeft}\n\n` +
    `Por favor, acesse o JumpCloud e atualize sua senha antes da data limite para evitar bloqueio de acesso.\n` +
    `🔗 https://console.jumpcloud.com`;

  try {
    await app.client.chat.postMessage({ channel: slackUserId, text });
  } catch (e) {
    console.error('[JumpCloud] sendPasswordExpiryDm:', e);
  }
}

/**
 * Envia resumo diário para o canal de segurança (lista de usuários com senha expirando).
 */
export async function sendPasswordExpirySummary(
  items: { name: string; email: string; daysLeft: number }[]
): Promise<void> {
  if (!JUMPCLOUD_SLACK_CHANNEL_ID || items.length === 0) return;
  const { getSlackApp } = await import('./slackService');
  const app = getSlackApp();
  if (!app?.client) return;

  const lines = items.map((i) => `• *${i.name}* (${i.email}) — expira em ${i.daysLeft} dias`);
  const text =
    `📋 *Resumo Diário — Senhas Próximas de Expirar*\n\n` +
    `${items.length} usuários com senha expirando nos próximos 7 dias:\n` +
    lines.join('\n');

  try {
    await app.client.chat.postMessage({ channel: JUMPCLOUD_SLACK_CHANNEL_ID, text });
  } catch (e) {
    console.error('[JumpCloud] sendPasswordExpirySummary:', e);
  }
}

/**
 * Verifica se o usuário (Theris userId) já recebeu notificação de expiração hoje.
 */
export async function wasPasswordExpiryNotifiedToday(userId: string): Promise<boolean> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  try {
    const sent = await prisma.senhaExpiracaoNotificacao.findFirst({
      where: { userId, sentAt: { gte: startOfToday } },
      select: { id: true }
    });
    return !!sent;
  } catch (e) {
    console.error('[JumpCloud] wasPasswordExpiryNotifiedToday:', e);
    return true; // em caso de erro, não notificar de novo
  }
}

/**
 * Registra que enviamos notificação de expiração para o usuário (evita spam).
 */
export async function recordPasswordExpiryNotification(userId: string): Promise<void> {
  try {
    await prisma.senhaExpiracaoNotificacao.create({
      data: { userId }
    });
  } catch (e) {
    console.error('[JumpCloud] recordPasswordExpiryNotification:', e);
  }
}
