/**
 * Wrapper sobre registrarMudanca pra eventos de autenticação.
 *
 * Usa a tabela HistoricoMudanca existente com tipo = 'AUTH_*'. IP e User-Agent
 * são hasheados via HMAC com IP_PEPPER pra preservar correlação sem armazenar PII bruta (LGPD).
 *
 * Writes são fire-and-forget: NUNCA bloquear o fluxo de auth por falha em audit.
 */

import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { registrarMudanca } from '../lib/auditLog';

const IP_PEPPER_RAW = process.env.IP_PEPPER ?? '';
if (IP_PEPPER_RAW.length < 32) {
  throw new Error('IP_PEPPER inválido: defina env var com >=32 chars');
}
const IP_PEPPER = Buffer.from(IP_PEPPER_RAW, 'utf8');

export type AuthEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_LOGOUT_ALL'
  | 'AUTH_SESSION_CREATED'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_SESSION_EXPIRED_IDLE'
  | 'AUTH_SESSION_EXPIRED_ABSOLUTE'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_REUSE_DETECTED'
  | 'AUTH_REFRESH_INVALID'
  | 'AUTH_MFA_CHALLENGE_SENT'
  | 'AUTH_MFA_VERIFIED'
  | 'AUTH_MFA_FAILED'
  | 'AUTH_MFA_EXHAUSTED'
  | 'AUTH_CSRF_FAILURE'
  | 'AUTH_RATE_LIMIT_HIT';

/** Hash HMAC-SHA-256(value, IP_PEPPER) → hex string (curto pra coluna texto). */
export function hashForAudit(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac('sha256', IP_PEPPER).update(value).digest('hex');
}

interface LogAuthEventParams {
  req: Request;
  event: AuthEventType;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra evento de auth. Fire-and-forget: erros são logados mas nunca lançados.
 *
 * IP e User-Agent são incluídos hasheados em metadata.
 */
export async function logAuthEvent(params: LogAuthEventParams): Promise<void> {
  const { req, event, userId, metadata } = params;
  try {
    const ipHash = hashForAudit(req.ip ?? req.socket?.remoteAddress ?? null);
    const uaHash = hashForAudit((req.get('user-agent') ?? '').slice(0, 256));
    const fullMetadata = {
      ...(metadata ?? {}),
      ipHash,
      uaHash,
    };
    await registrarMudanca({
      tipo: event,
      entidadeTipo: 'User',
      entidadeId: userId ?? 'anonymous',
      descricao: `Evento de autenticação: ${event}`,
      dadosAntes: undefined,
      dadosDepois: fullMetadata as object,
      // Omitir quando anônimo: HistoricoMudanca.autorId é FK → User.id ('system' quebraria insert).
      autorId: userId ?? undefined,
    });
  } catch (err) {
    console.error('[auditAuth] falha ao registrar evento', event, err);
  }
}
