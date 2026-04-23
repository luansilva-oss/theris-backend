/**
 * Validacao criptografica de Google id_token (OIDC).
 *
 * vs fluxo legado (validacao de access_token via userinfo endpoint):
 * - id_token e JWT assinado pelo Google; verifyIdToken valida JWKS
 * - audience check (aud === GOOGLE_CLIENT_ID) bloqueia confused deputy attack
 *   (atacante usar access_token de OUTRA app onde user @grupo-3c.com consentiu)
 * - Single-source-of-truth: dados vem dos claims, nao de fetch separado
 *
 * Refs: OWASP OAuth Security Cheat Sheet, RFC 9700 §4.4.
 */

import { OAuth2Client, type TokenPayload } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const HD = (process.env.GOOGLE_WORKSPACE_HD ?? 'grupo-3c.com').toLowerCase();

if (!CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID nao configurado');
}

const oauthClient = new OAuth2Client(CLIENT_ID);

export interface VerifiedGoogleIdentity {
  sub: string; // Google subject — identidade canonica imutavel
  email: string; // Email normalizado (lowercase)
  emailVerified: boolean;
  name: string | null;
  hd: string | null; // Hosted domain do Workspace
  rawPayload: TokenPayload;
}

export class GoogleVerifyError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleVerifyError';
  }
}

/**
 * Valida id_token Google. Lanca GoogleVerifyError em qualquer falha.
 *
 * Validacoes (em ordem):
 *  1. Assinatura JWKS, iss, exp, iat (verifyIdToken faz internamente)
 *  2. audience === GOOGLE_CLIENT_ID
 *  3. email_verified === true
 *  4. hd === GOOGLE_WORKSPACE_HD (Workspace correto)
 *  5. email termina em @${HD}
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  if (!idToken || typeof idToken !== 'string') {
    throw new GoogleVerifyError('INVALID_TOKEN_FORMAT', 'idToken ausente ou invalido');
  }

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });
  } catch (err) {
    throw new GoogleVerifyError(
      'TOKEN_VERIFICATION_FAILED',
      `Falha ao verificar id_token: ${(err as Error).message}`,
    );
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new GoogleVerifyError('NO_PAYLOAD', 'id_token sem payload');
  }

  if (!payload.sub) {
    throw new GoogleVerifyError('NO_SUB', 'id_token sem sub claim');
  }

  if (!payload.email) {
    throw new GoogleVerifyError('NO_EMAIL', 'id_token sem email claim');
  }

  if (payload.email_verified !== true) {
    throw new GoogleVerifyError('EMAIL_UNVERIFIED', 'email Google nao verificado');
  }

  const email = payload.email.toLowerCase().trim();
  const hd = typeof payload.hd === 'string' ? payload.hd.toLowerCase().trim() : null;

  // Hosted domain check (Workspace)
  if (hd !== HD) {
    throw new GoogleVerifyError('WRONG_WORKSPACE', `hd=${hd ?? 'null'}, esperado ${HD}`);
  }

  // Email domain check (defesa em profundidade)
  if (!email.endsWith(`@${HD}`)) {
    throw new GoogleVerifyError('WRONG_EMAIL_DOMAIN', `email ${email} nao pertence a @${HD}`);
  }

  return {
    sub: payload.sub,
    email,
    emailVerified: true,
    name: typeof payload.name === 'string' ? payload.name : null,
    hd,
    rawPayload: payload,
  };
}
