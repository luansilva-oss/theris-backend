import { WebClient } from '@slack/web-api';
import type { Block, KnownBlock } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const CANAL_SGSI = process.env.SGSI_SLACK_CHANNEL_ID || 'C0AA64X7CTZ';

// IDs fixos do time de SI
const SGSI_TEAM_IDS = [
  process.env.SLACK_ID_LUAN,
  process.env.SLACK_ID_VLADIMIR,
  process.env.SLACK_ID_ALLAN,
].filter(Boolean) as string[];

export async function enviarDm(email: string, texto: string): Promise<void> {
  try {
    const result = await slack.users.lookupByEmail({ email });
    const userId = result.user?.id;
    if (!userId) return;
    const dm = await slack.conversations.open({ users: userId });
    const channelId = dm.channel?.id;
    if (!channelId) return;
    await slack.chat.postMessage({ channel: channelId, text: texto });
  } catch (err) {
    console.error(`[SGSI Slack] Erro ao enviar DM para ${email}:`, err);
  }
}

export async function enviarDmPorId(userId: string, texto: string): Promise<void> {
  try {
    const dm = await slack.conversations.open({ users: userId });
    const channelId = dm.channel?.id;
    if (!channelId) return;
    await slack.chat.postMessage({ channel: channelId, text: texto });
  } catch (err) {
    console.error(`[SGSI Slack] Erro ao enviar DM para ID ${userId}:`, err);
  }
}

export async function enviarDmTimeSI(texto: string): Promise<void> {
  await Promise.allSettled(SGSI_TEAM_IDS.map(id => enviarDmPorId(id, texto)));
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
