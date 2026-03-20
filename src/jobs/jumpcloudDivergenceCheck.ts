/**
 * Verificação periódica: divergências Employment Information (Theris × JumpCloud).
 * Segunda-feiras às 08:00 (America/Sao_Paulo) — ver startJumpCloudDivergenceCron().
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { getSlackApp } from '../services/slackService';

const prisma = new PrismaClient();

const SYSTEM_USERS_URL = 'https://console.jumpcloud.com/api/systemusers';
const BATCH_SIZE = 10;
const CRON_SCHEDULE = '0 8 * * 1'; // Segunda-feira 08:00

function norm(s: string | null | undefined): string {
  return (s ?? '').trim();
}

type JcEmployment = { jobTitle: string; department: string; company: string };

/** GET systemusers com filter por e-mail; tenta fields= para reduzir payload. */
async function fetchJumpCloudEmployment(email: string): Promise<JcEmployment | null> {
  const apiKey = process.env.JUMPCLOUD_API_KEY?.trim();
  if (!apiKey) return null;

  const encodedEmail = encodeURIComponent(email);
  const fieldsParam = encodeURIComponent('jobTitle,department,company');
  const urls = [
    `${SYSTEM_USERS_URL}?filter=email:eq:${encodedEmail}&fields=${fieldsParam}`,
    `${SYSTEM_USERS_URL}?filter=email:eq:${encodedEmail}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
      const row = list.find(
        (u: { email?: string }) => (u.email || '').toLowerCase() === email.toLowerCase()
      ) as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        jobTitle: norm(String(row.jobTitle ?? '')),
        department: norm(String(row.department ?? '')),
        company: norm(String(row.company ?? ''))
      };
    } catch {
      /* tenta URL seguinte */
    }
  }
  return null;
}

type DivergenceEntry = {
  name: string;
  email: string;
  lines: string[];
};

function compareUser(
  u: {
    name: string;
    email: string;
    jobTitle: string | null;
    departmentRef: { name: string } | null;
    unitRef: { name: string } | null;
  },
  jc: JcEmployment
): DivergenceEntry | null {
  const tJob = norm(u.jobTitle);
  const tDept = norm(u.departmentRef?.name);
  const tCompany = norm(u.unitRef?.name);

  const lines: string[] = [];
  if (tJob !== jc.jobTitle) {
    lines.push(`• jobTitle: Theris="${tJob}" | JumpCloud="${jc.jobTitle}"`);
  }
  if (tDept !== jc.department) {
    lines.push(`• department: Theris="${tDept}" | JumpCloud="${jc.department}"`);
  }
  if (tCompany !== jc.company) {
    lines.push(`• company: Theris="${tCompany}" | JumpCloud="${jc.company}"`);
  }

  if (lines.length === 0) return null;
  return { name: u.name, email: u.email, lines };
}

async function checkOneUser(u: {
  name: string;
  email: string;
  jobTitle: string | null;
  departmentRef: { name: string } | null;
  unitRef: { name: string } | null;
}): Promise<DivergenceEntry | null> {
  try {
    const jc = await fetchJumpCloudEmployment(u.email);
    if (!jc) return null;
    return compareUser(u, jc);
  } catch (e) {
    console.error(`[JumpCloud Divergence] Erro ao verificar ${u.email}:`, e);
    return null;
  }
}

/** Processa um lote de usuários em paralelo (máx. BATCH_SIZE). */
async function processBatch(
  batch: {
    name: string;
    email: string;
    jobTitle: string | null;
    departmentRef: { name: string } | null;
    unitRef: { name: string } | null;
  }[]
): Promise<DivergenceEntry[]> {
  const results = await Promise.all(batch.map((u) => checkOneUser(u)));
  return results.filter((r): r is DivergenceEntry => r != null);
}

export async function runJumpCloudDivergenceCheck(): Promise<void> {
  if (!process.env.JUMPCLOUD_API_KEY?.trim()) {
    console.warn('[JumpCloud Divergence] JUMPCLOUD_API_KEY ausente; verificação ignorada.');
    return;
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      jobTitle: true,
      departmentRef: { select: { name: true } },
      unitRef: { select: { name: true } }
    }
  });

  const divergences: DivergenceEntry[] = [];
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const found = await processBatch(batch);
    divergences.push(...found);
  }

  if (divergences.length === 0) {
    console.log(
      `[JumpCloud Divergence] Nenhuma divergência entre Theris e JumpCloud (${users.length} usuário(s) ativo(s) verificados).`
    );
    return;
  }

  const channelId = process.env.SLACK_SI_CHANNEL_ID?.trim();
  if (!channelId) {
    console.error('[JumpCloud Divergence] SLACK_SI_CHANNEL_ID não definido; não foi possível alertar o SI.');
    return;
  }

  const app = getSlackApp();
  if (!app?.client) {
    console.error('[JumpCloud Divergence] Slack app não disponível; não foi possível enviar alerta.');
    return;
  }

  const maxBlocks = 15;
  const parts: string[] = ['⚠️ *Divergências JumpCloud × Theris detectadas*\n'];
  const slice = divergences.slice(0, maxBlocks);
  for (const d of slice) {
    parts.push(`*Usuário:* ${d.name} (${d.email})`);
    parts.push(d.lines.join('\n'));
    parts.push('');
  }
  if (divergences.length > maxBlocks) {
    parts.push(`_…e mais ${divergences.length - maxBlocks} usuário(s) não listados aqui._\n`);
  }
  parts.push(`*Total:* ${divergences.length} usuário(s) com divergência`);

  const text = parts.join('\n');

  try {
    await app.client.chat.postMessage({
      channel: channelId,
      text,
      mrkdwn: true
    });
    console.log(`[JumpCloud Divergence] Alerta enviado ao canal SI (${divergences.length} divergência(s)).`);
  } catch (e) {
    console.error('[JumpCloud Divergence] Falha ao postar no Slack:', e);
  }
}

export function startJumpCloudDivergenceCron(): void {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('🕐 [Cron] Verificação de divergências Theris × JumpCloud...');
      try {
        await runJumpCloudDivergenceCheck();
        console.log('✅ [Cron] Verificação de divergências JumpCloud concluída.');
      } catch (e) {
        console.error('❌ [Cron] Erro na verificação de divergências JumpCloud:', e);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );
  console.log('📅 Cron de divergências JumpCloud × Theris: toda segunda-feira às 08:00 (Brasília)');
}
