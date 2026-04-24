/**
 * Handlers de auth legados (DEPRECATED).
 *
 * Substituidos pelos endpoints do src/auth/:
 *   - POST /api/login/google        -> POST /api/auth/google-login-challenge
 *   - POST /api/auth/send-mfa       -> POST /api/auth/google-login-challenge (inclui MFA send)
 *   - POST /api/auth/verify-mfa     -> POST /api/auth/verify-mfa-and-login
 *
 * Retornamos HTTP 410 Gone ao inves de remover as rotas pra dar erro
 * explicativo a qualquer cliente externo ou versao legada do frontend
 * que ainda bater nesses endpoints (vs 404 que seria ambiguo).
 *
 * Imports preservados em src/index.ts linha 27 pra manter compatibilidade
 * do roteador; os symbols continuam existindo como handlers-stub.
 *
 * Deletados neste commit (agora vivos apenas no git history):
 *   - Validacao de access_token via userinfo endpoint (vulneravel a
 *     confused deputy attack — substituido por verifyIdToken com aud check)
 *   - mfaCode em texto puro na tabela User (substituido por MfaChallenge
 *     com HMAC)
 *   - logLoginAttempt privada (substituido por logAuthEvent em
 *     src/auth/auditAuth.ts, reusada pelos novos handlers)
 *   - normalizeEmail, CORPORATE_EMAIL_REGEX, getClientIp helpers
 *     (nao-usados pelos novos handlers; email check feito em googleVerify.ts)
 *
 * Refs: refactor-auth bloco-8/16.
 */

import type { Request, Response } from 'express';

function deprecated410(redirectHint: string) {
  return async (_req: Request, res: Response) => {
    res.status(410).json({
      error: 'ENDPOINT_DEPRECATED',
      message: `Este endpoint foi removido. Use ${redirectHint} no lugar.`,
    });
  };
}

export const googleLogin = deprecated410('POST /api/auth/google-login-challenge');
export const sendMfa = deprecated410('POST /api/auth/google-login-challenge (inclui envio de MFA)');
export const verifyMfa = deprecated410('POST /api/auth/verify-mfa-and-login');
