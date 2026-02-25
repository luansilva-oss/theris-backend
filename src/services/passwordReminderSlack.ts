/**
 * Serviço para enviar DM no Slack lembrando o usuário de alterar senhas (ciclo 90 dias).
 * Usa users.lookupByEmail e chat.postMessage.
 */
import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN;
const slackClient = token ? new WebClient(token) : null;

export interface PasswordReminderOptions {
  userEmail: string;
  userName: string;
  /** Lista de sistemas/ferramentas que o usuário tem acesso (opcional) */
  toolNames?: string[];
}

/**
 * Busca o ID do usuário no Slack pelo e-mail e envia uma DM com o lembrete de troca de senha.
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
    let text = `Olá *${userName}*! 👋\n\nJá se passaram *90 dias* desde a sua última atualização de senhas. Por questões de segurança, por favor, atualize suas credenciais nos sistemas que você utiliza.`;

    if (Array.isArray(toolNames) && toolNames.length > 0) {
      text += `\n\n_Sistemas que você tem acesso:_\n${toolNames.map(t => `• ${t}`).join('\n')}`;
    }

    text += `\n\n_Obrigado! — Theris OS_`;

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
