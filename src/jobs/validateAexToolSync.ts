/**
 * Validação semanal: ferramentas Catálogo Theris (sigla ap_*) × usergroups JumpCloud (nome ap_*).
 * Segundas 08:30 BRT — ver startValidateAexToolSyncCron().
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { fetchAllJumpCloudUserGroups, type JcUserGroup } from '../services/jumpcloudGroupSyncService';
import { getSlackApp, formatTimestampBrt } from '../services/slackService';

const prisma = new PrismaClient();
const CRON_SCHEDULE = '30 8 * * 1'; // Segunda 08:30 (America/Sao_Paulo)
const LIST_MAX = 20;

type ToolRow = {
  id: string;
  name: string;
  acronym: string | null;
  owner: { name: string } | null;
};

function joinLines(lines: string[], max: number = LIST_MAX): string {
  if (lines.length === 0) return '_Nenhum._';
  if (lines.length <= max) return lines.join('\n');
  return `${lines.slice(0, max).join('\n')}\n_… e mais ${lines.length - max} item(ns)_`;
}

export async function validateAexToolSync(): Promise<void> {
  const channelId = (process.env.SLACK_SI_CHANNEL_ID || '').trim();
  const tsBrt = formatTimestampBrt();

  let tools: ToolRow[] = [];
  try {
    tools = await prisma.tool.findMany({
      where: {
        AND: [{ acronym: { not: null } }, { acronym: { startsWith: 'ap_', mode: 'insensitive' } }]
      },
      include: { owner: { select: { name: true } } }
    });
  } catch (e) {
    console.error('[validateAexToolSync] Falha ao listar Tools:', e);
  }

  let allGroups: JcUserGroup[] = [];
  try {
    allGroups = await fetchAllJumpCloudUserGroups();
  } catch (e) {
    console.error('[validateAexToolSync] Falha ao listar grupos JumpCloud:', e);
  }

  const jcApGroups = allGroups.filter((g) => (g.name || '').toLowerCase().startsWith('ap_'));

  const apiKeyPresent = !!(process.env.JUMPCLOUD_API_KEY || '').trim();
  const jcFetchSuspectEmpty = apiKeyPresent && allGroups.length === 0;

  const jcByLower = new Map<string, JcUserGroup>();
  for (const g of jcApGroups) {
    const k = (g.name || '').trim().toLowerCase();
    if (k && !jcByLower.has(k)) jcByLower.set(k, g);
  }

  const missingInJc: ToolRow[] = [];
  const caseDivergent: { tool: ToolRow; jc: JcUserGroup }[] = [];
  let pairsOk = 0;

  for (const tool of tools) {
    const ac = (tool.acronym || '').trim();
    const k = ac.toLowerCase();
    const jc = jcByLower.get(k);
    if (!jc) {
      missingInJc.push(tool);
      continue;
    }
    if (ac === (jc.name || '').trim()) pairsOk += 1;
    else caseDivergent.push({ tool, jc });
  }

  const therisLower = new Set(tools.map((t) => (t.acronym || '').trim().toLowerCase()).filter(Boolean));
  const orphanJc: JcUserGroup[] = [];
  for (const g of jcApGroups) {
    const k = (g.name || '').trim().toLowerCase();
    if (!therisLower.has(k)) orphanJc.push(g);
  }

  const divergencias = missingInJc.length + orphanJc.length + caseDivergent.length;

  if (!channelId) {
    console.warn('[validateAexToolSync] SLACK_SI_CHANNEL_ID não definido; relatório não enviado.');
    return;
  }

  const app = getSlackApp();
  if (!app?.client) {
    console.warn('[validateAexToolSync] Slack app indisponível; relatório não enviado.');
    return;
  }

  try {
    const blocks: Record<string, unknown>[] = [
      { type: 'header', text: { type: 'plain_text', text: '🔍 Validação: Catálogo Theris × Grupos JumpCloud', emoji: true } }
    ];

    if (jcFetchSuspectEmpty) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '⚠️ *Aviso:* a API JumpCloud não retornou usergroups (lista vazia). Pode ser falha de rede, permissão ou API key. Conferir logs do servidor.'
        }
      });
    }

    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Total no Theris:* ${tools.length} ferramentas ap_*\n` +
            `*Total no JumpCloud:* ${jcApGroups.length} grupos ap_*\n` +
            `*Pares OK (nome idêntico):* ${pairsOk} ✅\n` +
            `*Divergências:* ${divergencias} ⚠️`
        }
      },
      { type: 'divider' }
    );

    if (missingInJc.length > 0) {
      const lines = missingInJc.map(
        (t) =>
          `• \`${t.acronym}\` — ${t.name} — Owner: ${t.owner?.name ?? '—'}`
      );
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*❌ No Theris mas sem grupo no JumpCloud:*\n${joinLines(lines)}\n` +
            '_(acesso AEX não será provisionado para estas ferramentas)_'
        }
      });
    }

    if (orphanJc.length > 0) {
      const lines = orphanJc.map((g) => `• \`${g.name}\``);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*⚠️ No JumpCloud mas sem ferramenta no Theris:*\n${joinLines(lines)}\n` +
            '_(grupos órfãos — verificar se devem ser cadastrados no Catálogo)_'
        }
      });
    }

    if (caseDivergent.length > 0) {
      const lines = caseDivergent.map(
        ({ tool, jc }) => `• Theris \`${tool.acronym}\` × JumpCloud \`${jc.name}\``
      );
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*⚠️ Case divergente (match funcional após correção do código):*\n${joinLines(lines)}\n` +
            '_(considerar padronizar as siglas no Catálogo Theris)_'
        }
      });
    }

    if (missingInJc.length === 0 && orphanJc.length === 0 && caseDivergent.length === 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: '_Nenhuma divergência entre catálogo ap_* e grupos JumpCloud ap_*._' }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Executado em ${tsBrt} BRT · Cache JumpCloud: ${allGroups.length} grupos carregados (lista completa paginada)`
        }
      ]
    });

    const fallbackText = `🔍 Validação Theris × JumpCloud AEX — Theris: ${tools.length} · JC ap_*: ${jcApGroups.length} · OK: ${pairsOk} · Divergências: ${divergencias}`;

    await app.client.chat.postMessage({
      channel: channelId,
      text: fallbackText,
      blocks: blocks as any
    });
    console.log('[validateAexToolSync] Relatório enviado ao canal SI.');
  } catch (e) {
    console.error('[validateAexToolSync] Falha ao postar no Slack:', e);
    try {
      await app.client.chat.postMessage({
        channel: channelId,
        text: `⚠️ *Validação AEX*\nFalha ao montar relatório completo. Ver logs do servidor.\n🕒 ${tsBrt} BRT`
      });
    } catch (_) {}
  }
}

export function startValidateAexToolSyncCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Validação Theris × JumpCloud (AEX ap_*)...');
      try {
        await validateAexToolSync();
        console.log('✅ [Cron] Validação AEX concluída.');
      } catch (e) {
        console.error('❌ [Cron] Erro na validação AEX:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Validação AEX (catálogo × grupos JumpCloud): segundas às 08:30 (Brasília)');
}
