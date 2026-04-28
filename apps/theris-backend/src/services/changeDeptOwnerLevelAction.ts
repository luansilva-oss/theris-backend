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

export type DeptReviewFlowKind = 'revogacao' | 'provisionamento' | 'revisao';

export type DeptReviewDonePayload = {
  requestId: string;
  toolId: string;
  tipo: DeptReviewFlowKind;
  dmChannel?: string;
  dmTs?: string;
  /** Só revisão: níveis exibidos na DM original (KBS). */
  nivelAnt?: string;
  nivelNovo?: string;
  /** Texto da data exibida na DM (ex.: DD/MM/AAAA). */
  dataAcao?: string;
};

const BLOCKED_STATUS = new Set(['REPROVADO', 'REJEITADO', 'CANCELADO', 'CANCELADA']);

/** Persiste confirmação e substitui o block de ações por context (espelha cargo_review_done). */
export async function handleDeptReviewDoneAction(
  client: WebClient,
  payload: {
    clickerSlackId: string;
    bodyChannel?: string | null;
    parsed: DeptReviewDonePayload;
  }
): Promise<void> {
  const { clickerSlackId, parsed, bodyChannel } = payload;
  const { requestId, toolId, tipo } = parsed;
  const dmChannel = (parsed.dmChannel || bodyChannel || '').trim();
  const dmTs = (parsed.dmTs || '').trim();
  const nivelAnt = (parsed.nivelAnt ?? '—').trim() || '—';
  const nivelNovo = (parsed.nivelNovo ?? '—').trim() || '—';
  const dataAcao = (parsed.dataAcao ?? '').trim();
  const dataBlockRevProv = dataAcao ? `*Data da mudança:* ${dataAcao}\n\n` : '';
  const dataBlockRevisao = dataAcao ? `*Data:* ${dataAcao}\n\n` : '';

  if (!['revogacao', 'provisionamento', 'revisao'].includes(tipo)) {
    console.warn(JSON.stringify({ event: 'change_role.dept_review_done.invalid_tipo', requestId, toolId, tipo }));
    return;
  }

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { owner: { select: { name: true, id: true } } }
  });
  if (!request || !tool) return;

  if (request.type !== 'CHANGE_ROLE') {
    console.warn(JSON.stringify({ event: 'change_role.dept_review_done.wrong_type', requestId, type: request.type }));
    return;
  }

  if (BLOCKED_STATUS.has(request.status)) {
    console.warn(
      JSON.stringify({
        event: 'change_role.dept_review_done.request_terminal',
        requestId,
        status: request.status
      })
    );
    return;
  }

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
        event: 'change_role.dept_review_done.unauthorized_click',
        requestId,
        toolId,
        clickerUserId
      })
    );
    return;
  }

  if (!clickerUserId) {
    console.warn(JSON.stringify({ event: 'change_role.dept_review_done.no_theris_user', requestId, toolId }));
    return;
  }

  try {
    await prisma.toolOwnerChangeDeptConfirmation.upsert({
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
    console.warn(JSON.stringify({ event: 'change_role.dept_review_done.upsert_failed', requestId, toolId, err: String(e) }));
    return;
  }

  const ownerName = tool.owner?.name || 'Owner';
  let colaboradorName = 'Colaborador';
  let deptAnterior = '';
  let deptNovo = '';
  try {
    const det = typeof request.details === 'string' ? JSON.parse(request.details || '{}') : (request.details || {});
    colaboradorName =
      (det.collaboratorName || det.info || 'Colaborador')?.toString().replace(/^[^:]+:\s*/, '') || 'Colaborador';
    const curr = det.current as Record<string, string> | undefined;
    const fut = det.future as Record<string, string> | undefined;
    deptAnterior = curr?.dept || '';
    deptNovo = fut?.dept || '';
  } catch {
    /* ignore */
  }

  const tipoLabel = tipo === 'revogacao' ? 'Revogação' : tipo === 'provisionamento' ? 'Provisionamento' : 'Revisão';
  const { registrarMudanca } = await import('../lib/auditLog');
  await registrarMudanca({
    tipo: 'DEPT_REVIEW_CONCLUIDO',
    entidadeTipo: 'Request',
    entidadeId: requestId,
    descricao: `Owner ${ownerName} confirmou ação de acesso de ${colaboradorName} em ${tool.name}. Tipo: ${tipoLabel}`,
    dadosDepois: {
      ownerName,
      toolName: tool.name,
      colaboradorName,
      tipo,
      deptAnterior,
      deptNovo,
      confirmedAt: new Date().toISOString()
    },
    autorId: clickerUserId ?? undefined
  });

  const linkChamado = `${frontendBase()}/tickets?id=${requestId}`;
  const headerByTipo: Record<DeptReviewFlowKind, string> = {
    revogacao: '🔄 Mudança de Departamento — Revogação de Acesso',
    provisionamento: '🔄 Mudança de Departamento — Provisionamento de Acesso',
    revisao: '🔄 Mudança de Departamento — Revisão de Nível'
  };
  const bodyByTipo: Record<DeptReviewFlowKind, string> = {
    revogacao:
      `Um colaborador saiu do departamento e precisa ter o acesso revogado na sua ferramenta.\n\n` +
      `*Colaborador:* ${colaboradorName}\n` +
      `*Departamento anterior:* ${deptAnterior}\n` +
      `*Novo departamento:* ${deptNovo}\n` +
      dataBlockRevProv +
      `🛠 *Ferramenta sob sua responsabilidade:* *${tool.name}* — Acesso a ser revogado\n\n` +
      `Por favor, remova o acesso do colaborador no sistema.`,
    provisionamento:
      `Um colaborador chegou ao departamento e precisa ter acesso concedido na sua ferramenta.\n\n` +
      `*Colaborador:* ${colaboradorName}\n` +
      `*Departamento anterior:* ${deptAnterior}\n` +
      `*Novo departamento:* ${deptNovo}\n` +
      dataBlockRevProv +
      `🛠 *Ferramenta sob sua responsabilidade:* *${tool.name}*\n\n` +
      `Por favor, provisione o acesso no sistema.`,
    revisao:
      `Colaborador mudou de departamento e mantém esta ferramenta com nível alterado.\n\n` +
      `*Colaborador:* ${colaboradorName}\n` +
      `*Depto anterior:* ${deptAnterior} → *Novo:* ${deptNovo}\n` +
      dataBlockRevisao +
      `🛠 *${tool.name}:* Nível anterior: ${nivelAnt} → Novo nível: ${nivelNovo}\n\n` +
      `Revise e ajuste o nível no sistema.`
  };

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: headerByTipo[tipo], emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${bodyByTipo[tipo]}\n👉 Ver chamado: <${linkChamado}|link no Theris>`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `✅ *Ajustado* por <@${clickerSlackId}> em ${formatBrt(new Date())}`
        }
      ]
    }
  ];

  const plainText = `${headerByTipo[tipo]} — ${tool.name} — ${colaboradorName}`;

  if (dmChannel && dmTs) {
    try {
      await client.chat.update({
        channel: dmChannel,
        ts: dmTs,
        text: plainText,
        blocks: blocks as never
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: 'change_role.dept_review_done.chat_update_failed',
          requestId,
          toolId,
          err: String(err)
        })
      );
    }
  } else {
    console.warn(
      JSON.stringify({
        event: 'change_role.dept_review_done.missing_dm_ref',
        requestId,
        toolId
      })
    );
  }
}
