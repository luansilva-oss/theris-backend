/**
 * Rate limiters para endpoints de auth.
 *
 * Lib: express-rate-limit v8.
 *
 * Estratégia: limitar por (IP + identificador semântico) onde aplicável,
 * pra evitar que IP único atrás de NAT bloqueie todos os usuários.
 *
 * Pré-requisito: app.set('trust proxy', 1) no Express raiz (Render é proxy reverso).
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

function ipFrom(req: Request): string {
  return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1');
}

/**
 * Login Google — 5 tentativas / 15 min por (IP + email do body).
 * skipSuccessfulRequests: sucessos não contam (só falhas).
 */
export const googleLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'TOO_MANY_LOGIN_ATTEMPTS' },
  keyGenerator: (req: Request) => {
    const email = String(req.body?.email ?? '')
      .toLowerCase()
      .trim();
    return `login:${ipFrom(req)}:${email}`;
  },
});

/**
 * Refresh — 30/15min por IP. Refresh é frequente em uso normal
 * (cada janela idle, ~30min). 30/15min cobre múltiplas abas e renovações.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REFRESH_ATTEMPTS' },
  keyGenerator: (req: Request) => `refresh:${ipFrom(req)}`,
});

/**
 * Verify MFA — 10/5min por (IP + body.challengeId quando presente).
 * Combina com attemptsLeft no MfaChallenge (5 tentativas por challenge).
 * 10 cobre cenário de usuário errar várias vezes seguidas com challenges renovados.
 */
export const verifyMfaLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TOO_MANY_MFA_ATTEMPTS' },
  keyGenerator: (req: Request) => {
    const challengeId = String(req.body?.challengeId ?? 'no-challenge');
    return `mfa:${ipFrom(req)}:${challengeId}`;
  },
});

/**
 * Send MFA — 5/15min por (IP + body.challengeId).
 * Limita re-envio de email (anti-bombing).
 */
export const sendMfaLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TOO_MANY_MFA_RESENDS' },
  keyGenerator: (req: Request) => {
    const challengeId = String(req.body?.challengeId ?? 'no-challenge');
    return `mfa-send:${ipFrom(req)}:${challengeId}`;
  },
});

/**
 * Logout — 60/15min por IP. Generoso porque logout deve ser sempre permitido,
 * mas limitamos pra evitar abuso de POST.
 */
export const logoutLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'TOO_MANY_LOGOUT_ATTEMPTS' },
  keyGenerator: (req: Request) => `logout:${ipFrom(req)}`,
});
