import { WebClient } from '@slack/web-api';
import type { Block, KnownBlock } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const CANAL_SGSI = process.env.SGSI_SLACK_CHANNEL_ID || 'C0AA64X7CTZ';

export async function enviarDm(email: string, texto: string): Promise<void> {
  try {
    // Busca o user ID pelo email
    const result = await slack.users.lookupByEmail({ email });
    const userId = result.user?.id;
    if (!userId) return;

    // Abre DM e envia
    const dm = await slack.conversations.open({ users: userId });
    const channelId = dm.channel?.id;
    if (!channelId) return;

    await slack.chat.postMessage({ channel: channelId, text: texto });
  } catch (err) {
    console.error(`[SGSI Slack] Erro ao enviar DM para ${email}:`, err);
  }
}

export async function enviarCanal(texto: string, blocks?: (Block | KnownBlock)[]): Promise<void> {
  try {
    await slack.chat.postMessage({
      channel: CANAL_SGSI,
      text: texto,
      ...(blocks && { blocks }),
    });
  } catch (err) {
    console.error('[SGSI Slack] Erro ao enviar mensagem no canal:', err);
  }
}
