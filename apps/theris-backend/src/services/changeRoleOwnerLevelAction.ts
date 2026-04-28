import type { WebClient } from '@slack/web-api';
import { prisma } from '../lib/prisma';

const frontendBase = () =>
  process.env.FRONTEND_URL || process.env.VITE_API_URL || 'https://theris.grupo-3c.com';

function formatBrt(d: Date): string {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export type CargoReviewDonePayload = {
  requestId: string;
  toolId: string;
  dmChannel?: string;
  dmTs?: string;
};

/** Persiste confirmação e substitui o block de ações por context (padrão ROOT_ACCESS). */
export async function handleCargoReviewDoneAction(
  client: WebClient,
  payload: {
    clickerSlackId: string;
    bodyChannel?: string | null;
    parsed: CargoReviewDonePayload;
  }
): Promise<void> {
  const { clickerSlackId, parsed, bodyChannel } = payload;
  const { requestId, toolId } = parsed;
  const dmChannel = (parsed.dmChannel || bodyChannel || '').trim();
  const dmTs = (parsed.dmTs || '').trim();

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { owner: { select: { name: true, id: true } } }
  });
  if (!request || !tool) return;

  let clickerUserId: string | null = null;
  try {
    const info = await client.users.info({ user: clickerSlackId });
    const email = info.user?.profile?.email;
    if (email) {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (u) clickerUserId = u.id;
    }
  } catch {
    /* ignore */
  }

  if (tool.ownerId && clickerUserId && clickerUserId !== tool.ownerId) {
    console.warn(
      JSON.stringify({
        event: 'change_role.cargo_review_done.unauthorized_click',
        requestId,
        toolId,
        clickerUserId
      })
    );
    return;
  }

  if (!clickerUserId) {
    console.warn(JSON.stringify({ event: 'change_role.cargo_review_done.no_theris_user', requestId, toolId }));
    return;
  }

  try {
    await prisma.toolOwnerChangeRoleConfirmation.upsert({
      where: {
        requestId_ownerId_toolId: {
          requestId,
          ownerId: clickerUserId,
          toolId
        }
      },
      create: {
        requestId,
        ownerId: clickerUserId,
        toolId,
        dmTs: dmTs || null,
        dmChannel: dmChannel || null
      },
      update: {
        confirmedAt: new Date(),
        ...(dmTs ? { dmTs } : {}),
        ...(dmChannel ? { dmChannel } : {})
      }
    });
  } catch (e) {
    console.warn(JSON.stringify({ event: 'change_role.cargo_review_done.upsert_failed', requestId, toolId, err: String(e) }));
    return;
  }

  const ownerName = tool.owner?.name || 'Owner';
  let colaboradorName = 'Colaborador';
  let cargoAnterior = '';
  let cargoNovo = '';
  try {
    const det = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    colaboradorName =
      (det.collaboratorName || det.info || 'Colaborador')?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
    const curr = det.current as Record<string, string> | undefined;
    const fut = det.future as Record<string, string> | undefined;
    cargoAnterior = curr?.role || '';
    cargoNovo = fut?.role || '';
  } catch {
    /* ignore */
  }

  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'CARGO_REVIEW_CONCLUIDO',
    entidadeTipo: 'Request',
    entidadeId: requestId,
    descricao: `Owner ${ownerName} confirmou ajuste de nível de ${colaboradorName} em ${tool.name}. Cargo anterior: ${cargoAnterior} → Novo: ${cargoNovo}`,
    dadosDepois: {
      ownerName,
      toolName: tool.name,
      colaboradorName,
      cargoAnterior,
      cargoNovo,
      confirmedAt: new Date().toISOString()
    },
    autorId: clickerUserId ?? undefined
  });

  if (dmChannel && dmTs) {
    const linkChamado = `${frontendBase()}/tickets?id=${requestId}`;
    const blocks: unknown[] = [
      { type: 'header', text: { type: 'plain_text', text: '🔄 Mudança de Cargo — Revisão de Acesso', emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `Um colaborador sob sua ferramenta mudou de cargo dentro do mesmo departamento.\n\n` +
            `*Colaborador:* ${colaboradorName}\n` +
            `*Cargo anterior:* ${cargoAnterior}\n` +
            `*Novo cargo:* ${cargoNovo}\n\n` +
            `🛠 *Ferramenta:* *${tool.name}*\n` +
            `👉 Ver chamado: <${linkChamado}|link no Theris>`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `✅ *Nível ajustado* por <@${clickerSlackId}> em ${formatBrt(new Date())}`
          }
        ]
      }
    ];
    try {
      await client.chat.update({
        channel: dmChannel,
        ts: dmTs,
        text: `Nível ajustado — ${tool.name} — ${colaboradorName}`,
        blocks: blocks as never
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'change_role.cargo_review_done.chat_update_failed',
          requestId,
          toolId,
          err: String(err)
        })
      );
    }
  } else {
    console.warn(
      JSON.stringify({
        event: 'change_role.cargo_review_done.missing_dm_ref',
        requestId,
        toolId
      })
    );
  }
}
