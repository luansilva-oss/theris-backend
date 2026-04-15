/**
 * Serviço para enviar DM no Slack lembrando o usuário de alterar senhas (ciclo 90 dias).
 * Usa users.lookupByEmail e chat.postMessage.
 * DM personalizada com base nas ferramentas do KBS do cargo do colaborador.
 */
import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN;
const slackClient = token ? new WebClient(token) : null;

/** Ferramentas permitidas para listar no lembrete (case-insensitive match) */
const ALLOWED_TOOL_NAMES = [
  'JumpCloud', 'ClickUp', 'HubSpot', '3C Plus', 'Evolux', 'Dizify', 'NetSuite', 'GitLab',
  'AWS', 'GCP', 'Convenia', 'Clicsign', 'Meta', 'FiqOn', 'N8N', 'Hik-Connect', 'Hik Connect',
  'ChatGPT', 'Chat GPT', 'Focus', 'Vindi', 'Nextrouter', 'NextRouter', 'Figma'
];

function isToolAllowed(toolName: string): boolean {
  const n = (toolName || '').trim();
  if (!n) return false;
  const lower = n.toLowerCase();
  return ALLOWED_TOOL_NAMES.some(allowed => lower.includes(allowed.toLowerCase()));
}

export interface PasswordReminderOptions {
  userEmail: string;
  userName: string;
  /** Lista de ferramentas do KBS do cargo (filtradas pela lista permitida) */
  toolNames?: string[];
}

/**
 * Busca o ID do usuário no Slack pelo e-mail e envia uma DM personalizada com o lembrete de troca de senha.
 */
export async function sendPasswordReminderDM(options: PasswordReminderOptions): Promise<{ ok: boolean; error?: string }> {
  const { userEmail, userName, toolNames } = options;

  if (!slackClient) {
    console.warn('⚠️ SLACK_BOT_TOKEN não configurado. Lembrete de senha não enviado.');
    return { ok: false, error: 'Slack não configurado' };
  }

  try {
    const lookup = await slackClient.users.lookupByEmail({ email: userEmail });
    if (!lookup.ok || !lookup.user?.id) {
      console.warn(`⚠️ Slack: usuário não encontrado para e-mail ${userEmail}`);
      return { ok: false, error: 'Usuário não encontrado no Slack' };
    }

    const slackUserId = lookup.user.id;
    const toolList = Array.isArray(toolNames) && toolNames.length > 0
      ? toolNames.filter(Boolean).map(t => `• ${t}`).join('\n')
      : '• (Lista não disponível — consulte seu gestor ou o time de SI)';

    const text = `🔐 *Lembrete de Segurança — Troca de Senhas*

Olá, *${userName}*! Este é seu lembrete trimestral obrigatório para atualização de senhas.

Com base nas suas ferramentas de trabalho, atualize suas senhas em:
${toolList}

⚠️ A troca de senhas é *obrigatória* e faz parte da política de segurança do Grupo 3C. Certifique-se de usar senhas fortes e únicas para cada sistema.

Em caso de dúvidas, contate o time de SI.`;

    await slackClient.chat.postMessage({
      channel: slackUserId,
      text,
      unfurl_links: false,
      unfurl_media: false,
    });

    console.log(`✅ Lembrete de senha enviado por DM para ${userEmail}`);
    return { ok: true };
  } catch (err: any) {
    console.error(`❌ Erro ao enviar lembrete de senha para ${userEmail}:`, err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

export { isToolAllowed };
