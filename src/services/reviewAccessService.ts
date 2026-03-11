/**
 * Revisão periódica de acessos (90 dias): notifica Owners no Slack com lista de ferramentas e colaboradores no KBS.
 * Cron diário às 9h; evita duplicata no mesmo dia por Owner.
 */
import { PrismaClient } from '@prisma/client';
import { getSlackApp } from './slackService';

const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';
const SLACK_ID_LUAN = process.env.SLACK_ID_LUAN || '';
const REVIEW_DAYS = 90;

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Colaborador com nível de acesso (KBS do cargo). */
type ColaboradorNivel = { nome: string; nivel: string };

/** Ferramenta com lista de colaboradores para revisão. */
type ToolComColaboradores = { id: string; name: string; colaboradores: ColaboradorNivel[] };

/**
 * Para uma ferramenta, retorna usuários ativos cujo cargo (Role) inclui essa ferramenta no KBS (RoleKitItem).
 */
async function getColaboradoresComFerramentaNoKBS(toolName: string): Promise<ColaboradorNivel[]> {
  const kitItems = await prisma.roleKitItem.findMany({
    where: { toolName: { equals: toolName, mode: 'insensitive' } },
    select: { roleId: true, accessLevelDesc: true }
  });
  if (kitItems.length === 0) return [];
  const roleIds = [...new Set(kitItems.map((k) => k.roleId))];
  const levelByRole = new Map(kitItems.map((k) => [k.roleId, k.accessLevelDesc ?? '—']));
  const users = await prisma.user.findMany({
    where: { roleId: { in: roleIds }, isActive: true },
    select: { name: true, roleId: true }
  });
  return users.map((u) => ({
    nome: u.name,
    nivel: levelByRole.get(u.roleId!) ?? '—'
  }));
}

/**
 * Busca ferramentas com revisão vencida: nextReviewAt <= now() OU (nextReviewAt nulo E createdAt <= now() - 90 dias).
 * Agrupa por ownerId e evita notificar o mesmo Owner mais de uma vez no mesmo dia.
 */
export async function runReviewAccessNotification(): Promise<void> {
  const slackApp = getSlackApp();
  if (!slackApp?.client) {
    console.warn('[Revisão Acessos] Slack não disponível.');
    return;
  }
  const client = slackApp.client;
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - REVIEW_DAYS);
  const startOfToday = startOfTodayUTC();

  try {
    const toolsDue = await prisma.tool.findMany({
      where: {
        ownerId: { not: null },
        OR: [
          { nextReviewAt: { lte: now } },
          {
            nextReviewAt: null,
            createdAt: { lte: ninetyDaysAgo }
          }
        ]
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' }
    });

    if (toolsDue.length === 0) {
      console.log('[Revisão Acessos] Nenhuma ferramenta com revisão vencida.');
      return;
    }

    const byOwner = new Map<string, typeof toolsDue>();
    for (const t of toolsDue) {
      if (!t.ownerId) continue;
      if (!byOwner.has(t.ownerId)) byOwner.set(t.ownerId, []);
      byOwner.get(t.ownerId)!.push(t);
    }

    for (const [ownerId, tools] of byOwner) {
      const alreadySentToday = await prisma.revisaoNotificacaoEnviada.findFirst({
        where: { ownerId, sentAt: { gte: startOfToday } }
      });
      if (alreadySentToday) continue;

      const owner = tools[0]?.owner;
      if (!owner?.email) continue;

      const toolsWithColaboradores: ToolComColaboradores[] = [];
      for (const tool of tools) {
        const colaboradores = await getColaboradoresComFerramentaNoKBS(tool.name);
        toolsWithColaboradores.push({
          id: tool.id,
          name: tool.name,
          colaboradores: colaboradores.length > 0 ? colaboradores : [{ nome: '—', nivel: 'Nenhum usuário ativo no KBS' }]
        });
      }

      let ownerSlackId: string | null = null;
      try {
        const lookup = await client.users.lookupByEmail({ email: owner.email });
        ownerSlackId = lookup.user?.id ?? null;
      } catch (_) {}
      if (!ownerSlackId && SLACK_ID_LUAN) ownerSlackId = SLACK_ID_LUAN;
      if (!ownerSlackId) {
        console.warn(`[Revisão Acessos] Owner ${owner.email} não encontrado no Slack; pulando.`);
        continue;
      }

      const ownerName = owner.name || 'Owner';
      const sections: string[] = [
        `⏳ *REVISÃO TRIMESTRAL DE ACESSOS — Theris*\n\nOlá, *${ownerName}*, o prazo de 90 dias para revisão das ferramentas sob sua responsabilidade expirou.\n\n🛠 *Ferramentas e Usuários para Revisão:*\n`
      ];
      for (const t of toolsWithColaboradores) {
        sections.push(`*${t.name}*`);
        for (const c of t.colaboradores) {
          sections.push(`• *${c.nome}* — Nível: ${c.nivel}`);
        }
        sections.push('');
      }
      sections.push('Após validar os acessos nos respectivos sistemas, clique no botão abaixo.');
      const linkTheris = `${FRONTEND_URL}/tickets`;
      const toolIdsValue = toolsWithColaboradores.map((t) => t.id).join(',');

      const blocks: any[] = [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: sections.join('\n').trim() }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Revisão Concluída', emoji: true },
              style: 'primary',
              action_id: 'review_completed',
              value: toolIdsValue
            }
          ]
        },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `🔗 <${linkTheris}|Ver no Theris>` }] }
      ];

      try {
        await client.chat.postMessage({
          channel: ownerSlackId,
          text: `⏳ Revisão trimestral de acessos — ${toolsWithColaboradores.map((t) => t.name).join(', ')}. Valide e confirme no Theris.`,
          blocks
        });
        await prisma.revisaoNotificacaoEnviada.create({
          data: { ownerId }
        });
        console.log(`[Revisão Acessos] DM enviada para owner ${owner.email} (${toolsWithColaboradores.length} ferramenta(s)).`);
      } catch (e) {
        console.error(`[Revisão Acessos] Erro ao enviar DM para ${owner.email}:`, e);
      }
    }
  } catch (e) {
    console.error('[Revisão Acessos] Erro na rotina:', e);
    throw e;
  }
}
