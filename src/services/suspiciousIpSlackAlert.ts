/**
 * Envia DM no Slack para o time de SI quando um IP atinge 5 tentativas de login com falha em 24h.
 * Busca usuários SUPER_ADMIN na tabela User e envia via users.lookupByEmail + chat.postMessage.
 */
import { WebClient } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';

const token = process.env.SLACK_BOT_TOKEN;
const slackClient = token ? new WebClient(token) : null;
const prisma = new PrismaClient();

const FAIL_REASON_LABELS: Record<string, string> = {
  GOOGLE_AUTH_FAILED: 'Falha no Google',
  DOMAIN_DENIED: 'Domínio negado',
  USER_NOT_FOUND: 'Usuário não encontrado',
  MFA_SEND_FAILED: 'Falha ao enviar MFA',
  MFA_INVALID: 'Código MFA inválido',
  MFA_EXPIRED: 'Código MFA expirado',
  RATE_LIMITED: 'Rate limit',
};

function formatTimestampBR(date: Date): string {
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  });
}

export async function sendSuspiciousIpAlertToSI(params: {
  ipAddress: string;
  email?: string | null;
  failReason?: string | null;
  timestamp?: Date;
}): Promise<void> {
  const { ipAddress, email, failReason, timestamp = new Date() } = params;
  if (!slackClient) {
    console.warn('⚠️ SLACK_BOT_TOKEN não configurado. Alerta de IP suspeito não enviado.');
    return;
  }

  try {
    const siUsers = await prisma.user.findMany({
      where: { systemProfile: 'SUPER_ADMIN', isActive: true },
      select: { email: true },
    });
    const emails = [...new Set(siUsers.map((u) => u.email).filter(Boolean))] as string[];

    const reasonLabel = failReason ? (FAIL_REASON_LABELS[failReason] ?? failReason) : '—';
    const text = `🚨 *IP Suspeito Detectado — Theris OS*

O IP \`${ipAddress}\` atingiu *5 tentativas de login com falha* nas últimas 24 horas.

*Último e-mail tentado:* ${email ?? 'desconhecido'}
*Último motivo:* ${reasonLabel}
*Horário:* ${formatTimestampBR(timestamp)}

Acesse o painel de Tentativas de Login para mais detalhes.`;

    for (const userEmail of emails) {
      try {
        const lookup = await slackClient.users.lookupByEmail({ email: userEmail });
        if (lookup.ok && lookup.user?.id) {
          await slackClient.chat.postMessage({
            channel: lookup.user.id,
            text,
            unfurl_links: false,
            unfurl_media: false,
          });
          console.log(`🔔 [IP Suspeito] DM enviada para ${userEmail}`);
        }
      } catch (e: any) {
        console.warn(`⚠️ [IP Suspeito] Falha ao enviar DM para ${userEmail}:`, e?.message ?? e);
      }
    }
  } catch (e) {
    console.error('[IP Suspeito] Erro ao enviar alertas:', e);
  }
}
