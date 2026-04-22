/**
 * Reconciliação mensal: colaboradores inativos no Theris com conta ainda não suspensa no JumpCloud.
 * Dia 1 de cada mês, 09:00 America/Sao_Paulo.
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { hasJumpCloudCredentials, jumpcloudFetch } from '../services/jumpcloudAuth';
import { getSlackApp, postSlackAcessosChannel, formatDateOnlyBrt } from '../services/slackService';

const prisma = new PrismaClient();
const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';
const CRON_SCHEDULE = '0 9 1 * *';

function siDmTargets(): string[] {
  const ids = [process.env.SLACK_ID_LUAN, process.env.SLACK_ID_VLADIMIR, process.env.SLACK_ID_ALLAN]
    .map((s) => (s || '').trim())
    .filter(Boolean);
  return ids as string[];
}

async function fetchJcUserSuspendedFlag(email: string): Promise<{ jcId: string; suspended: boolean } | null> {
  const encodedEmail = encodeURIComponent(email.trim());
  const url = `${SYSTEM_USERS_URL}?filter=email:eq:${encodedEmail}`;
  const res = await jumpcloudFetch(url, { method: 'GET' });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const list = Array.isArray(data) ? data : ((data as { results?: unknown[] }).results ?? (data as { data?: unknown[] }).data ?? []);
  const row = list[0] as { _id?: string; id?: string; suspended?: boolean } | undefined;
  if (!row) return null;
  const jcId = String(row._id ?? row.id ?? '');
  if (!jcId) return null;
  return { jcId, suspended: Boolean(row.suspended) };
}

async function resolveDesligadoEm(userId: string): Promise<Date | null> {
  const offboarded = await prisma.historicoMudanca.findFirst({
    where: { entidadeTipo: 'User', entidadeId: userId, tipo: 'USER_OFFBOARDED' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });
  if (offboarded?.createdAt) return offboarded.createdAt;

  const statusRows = await prisma.historicoMudanca.findMany({
    where: { entidadeTipo: 'User', entidadeId: userId, tipo: 'USER_STATUS_CHANGE' },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { createdAt: true, dadosDepois: true }
  });
  const deactivated = statusRows.find((row) => {
    const dep = row.dadosDepois as { isActive?: boolean } | null;
    return dep && dep.isActive === false;
  });
  return deactivated?.createdAt ?? null;
}

export async function runMonthlyJcOffboardingReconciliation(): Promise<void> {
  console.log('[JC Reconciliation] Início (mensal).');
  if (!hasJumpCloudCredentials()) {
    console.log('[JC Reconciliation] Credenciais JumpCloud ausentes — abortado.');
    return;
  }

  const candidates = await prisma.user.findMany({
    where: { isActive: false },
    select: { id: true, name: true, email: true, jumpcloudId: true }
  });
  console.log(`[JC Reconciliation] Candidatos (Theris inativo): ${candidates.length}`);

  const ativosNoJc: { name: string; email: string; jcId: string; desligadoEm: Date }[] = [];

  for (const c of candidates) {
    try {
      const jc = await fetchJcUserSuspendedFlag(c.email);
      await new Promise((r) => setTimeout(r, 200));
      if (jc && jc.suspended === false) {
        const desligadoEm = (await resolveDesligadoEm(c.id)) ?? new Date();
        ativosNoJc.push({ name: c.name, email: c.email, jcId: jc.jcId, desligadoEm });
      }
    } catch (e) {
      console.warn('[JC Reconciliation] Falha ao verificar', c.email, e);
    }
  }

  const cronRun = new Date();
  const ref = new Date(cronRun.getFullYear(), cronRun.getMonth() - 1, 15);
  const mesAnterior = ref.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });

  try {
    await prisma.historicoMudanca.create({
      data: {
        tipo: 'JC_RECONCILIATION_RUN',
        entidadeTipo: 'System',
        entidadeId: 'monthly-jc-reconciliation',
        descricao: `Reconciliação mensal: ${candidates.length} candidatos, ${ativosNoJc.length} divergências`,
        dadosDepois: { candidates: candidates.length, divergences: ativosNoJc.length }
      }
    });
  } catch (e) {
    console.error('[JC Reconciliation] Falha ao registrar HistoricoMudanca:', e);
  }

  const app = getSlackApp();
  const client = app?.client;
  const dmTargets = siDmTargets();

  const postAll = async (text: string, blocks?: unknown[]) => {
    if (!client) {
      console.warn('[JC Reconciliation] Slack não disponível.');
      return;
    }
    for (const uid of dmTargets) {
      try {
        await client.chat.postMessage({ channel: uid, text, ...(blocks ? { blocks: blocks as any } : {}), mrkdwn: true });
      } catch (e) {
        console.error('[JC Reconciliation] DM falhou:', uid, e);
      }
    }
    await postSlackAcessosChannel(client, text, blocks);
  };

  if (ativosNoJc.length === 0) {
    const text =
      `✅ *Reconciliação mensal JumpCloud × Theris*\n` +
      `*Mês de referência:* ${mesAnterior}\n` +
      `Nenhuma divergência encontrada. Todos os ex-colaboradores do Theris estão com conta suspensa no JumpCloud.`;
    await postAll(text);
    console.log(`[JC Reconciliation] Fim — 0 divergências (${candidates.length} candidatos).`);
    return;
  }

  const lines = ativosNoJc.map(
    (u, i) =>
      `${i + 1}. *${u.name}* — ${u.email}\n   Desligado em: ${formatDateOnlyBrt(u.desligadoEm)}`
  );
  const text =
    `🔎 *Reconciliação mensal JumpCloud × Theris*\n` +
    `*Mês de referência:* ${mesAnterior}\n` +
    `*Ex-colaboradores com conta ativa no JumpCloud:* ${ativosNoJc.length}\n\n` +
    `${lines.join('\n\n')}\n\n` +
    `👉 Ação: revisar cada caso no console do JumpCloud e suspender se aplicável.`;

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text }
    }
  ];

  await postAll(text, blocks);
  console.log(`[JC Reconciliation] Fim — ${ativosNoJc.length} divergência(s) (${candidates.length} candidatos).`);
}

export function startMonthlyJcOffboardingReconciliationCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        await runMonthlyJcOffboardingReconciliation();
      } catch (e) {
        console.error('[Cron] monthlyJcOffboardingReconciliation:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron reconciliação JumpCloud × Theris (offboarding): dia 1 de cada mês às 09:00 (Brasília)');
}
