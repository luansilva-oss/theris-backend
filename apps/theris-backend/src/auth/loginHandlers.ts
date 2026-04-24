/**
 * Handlers do novo fluxo de login (Google id_token + MFA challenge).
 *
 * 3 endpoints (wiring no Bloco 5):
 *   POST /api/auth/google-login-challenge { idToken }
 *     → valida idToken, upsert User, cria MfaChallenge, envia email,
 *       retorna { challengeId, expiresAt } (SEM cookie de sessao)
 *   POST /api/auth/resend-mfa { challengeId }
 *     → regenera codigo do mesmo challenge, reenvia email
 *   POST /api/auth/verify-mfa-and-login { challengeId, code }
 *     → valida challenge + codigo + decrementa attemptsLeft
 *     → se OK: issueSessionPair → seta cookies → retorna { user }
 *
 * Sessao real (Session+RefreshToken+cookies) so nasce na etapa final.
 */

import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyGoogleIdToken, GoogleVerifyError } from './googleVerify';
import {
  createMfaChallenge,
  regenerateMfaCode,
  verifyMfaChallenge,
  hashChallengeId,
} from './mfaChallenge';
import { issueSessionPair } from './session';
import { logAuthEvent, hashForAudit } from './auditAuth';
import { sendMfaEmail } from '../services/emailService';

const prisma = new PrismaClient();

const userSelect = {
  id: true,
  email: true,
  name: true,
  jobTitle: true,
  departmentId: true,
  unitId: true,
  roleId: true,
  managerId: true,
  systemProfile: true,
  isActive: true,
  googleSub: true,
  manager: { select: { id: true, name: true } },
} as const;

/* =============================================================
 * 1. POST /api/auth/google-login-challenge
 * ============================================================= */

interface GoogleLoginChallengeBody {
  idToken?: string;
}

export async function handleGoogleLoginChallenge(req: Request, res: Response): Promise<void> {
  const { idToken } = (req.body ?? {}) as GoogleLoginChallengeBody;

  if (!idToken || typeof idToken !== 'string') {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'idToken obrigatorio' });
    return;
  }

  // 1. Valida id_token Google
  let identity;
  try {
    identity = await verifyGoogleIdToken(idToken);
  } catch (err) {
    if (err instanceof GoogleVerifyError) {
      await logAuthEvent({
        req,
        event: 'AUTH_LOGIN_FAILURE',
        metadata: { reason: 'GOOGLE_VERIFY_FAILED', code: err.code },
      });
      // Nao vaza detalhes pro cliente
      res.status(401).json({ error: 'GOOGLE_AUTH_FAILED' });
      return;
    }
    console.error('[handleGoogleLoginChallenge] verify erro inesperado:', err);
    res.status(500).json({ error: 'AUTH_INTERNAL_ERROR' });
    return;
  }

  // 2. Upsert User (mantem comportamento legado: cria com Department "Geral" se novo)
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: identity.email },
      select: userSelect,
    });

    if (!user) {
      const deptGeral = await prisma.department.findFirst({
        where: { name: { equals: 'Geral', mode: 'insensitive' } },
        select: { id: true },
      });
      const created = await prisma.user.create({
        data: {
          email: identity.email,
          name: identity.name ?? 'Usuario Google',
          jobTitle: 'Colaborador',
          departmentId: deptGeral?.id ?? null,
          googleSub: identity.sub,
        },
        select: { id: true },
      });
      user = await prisma.user.findUnique({
        where: { id: created.id },
        select: userSelect,
      });
    } else if (!user.googleSub) {
      // Backfill googleSub no primeiro login pos-refactor
      await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: identity.sub },
      });
    }
  } catch (err) {
    console.error('[handleGoogleLoginChallenge] upsert erro:', err);
    res.status(500).json({ error: 'AUTH_INTERNAL_ERROR' });
    return;
  }

  if (!user) {
    res.status(500).json({ error: 'AUTH_INTERNAL_ERROR' });
    return;
  }

  if (!user.isActive) {
    await logAuthEvent({
      req,
      event: 'AUTH_LOGIN_FAILURE',
      userId: user.id,
      metadata: { reason: 'USER_INACTIVE' },
    });
    res.status(403).json({ error: 'ACCOUNT_DISABLED' });
    return;
  }

  // 3. Cria MfaChallenge + envia email
  let challenge;
  try {
    const ipHashHex = hashForAudit(req.ip ?? req.socket?.remoteAddress ?? null);
    const uaHashHex = hashForAudit((req.get('user-agent') ?? '').slice(0, 256));
    challenge = await createMfaChallenge({
      userId: user.id,
      ipHash: ipHashHex ? Buffer.from(ipHashHex, 'hex') : null,
      uaHash: uaHashHex ? Buffer.from(uaHashHex, 'hex') : null,
    });
  } catch (err) {
    console.error('[handleGoogleLoginChallenge] createMfaChallenge erro:', err);
    res.status(500).json({ error: 'AUTH_INTERNAL_ERROR' });
    return;
  }

  try {
    await sendMfaEmail(user.email, challenge.code);
  } catch (err) {
    // Email falhou — invalidamos o challenge pra forcar reinicio
    console.error('[handleGoogleLoginChallenge] sendMfaEmail erro:', err);
    await prisma.mfaChallenge
      .update({
        where: { id: challenge.challengeRowId },
        data: { consumedAt: new Date(), attemptsLeft: 0 },
      })
      .catch(() => {});
    res.status(502).json({ error: 'MFA_EMAIL_FAILED' });
    return;
  }

  await logAuthEvent({
    req,
    event: 'AUTH_MFA_CHALLENGE_SENT',
    userId: user.id,
    metadata: { challengeRowId: challenge.challengeRowId, expiresAt: challenge.expiresAt },
  });

  res.status(200).json({
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt.toISOString(),
    // Email do user pra UI mostrar "Codigo enviado para xxx@grupo-3c.com"
    emailHint: maskEmail(user.email),
  });
}

/* =============================================================
 * 2. POST /api/auth/resend-mfa
 * ============================================================= */

interface ResendMfaBody {
  challengeId?: string;
}

export async function handleResendMfa(req: Request, res: Response): Promise<void> {
  const { challengeId } = (req.body ?? {}) as ResendMfaBody;

  if (!challengeId || typeof challengeId !== 'string') {
    res.status(400).json({ error: 'INVALID_INPUT' });
    return;
  }

  const regenerated = await regenerateMfaCode(challengeId);
  if (!regenerated) {
    // Nao vaza se challenge existe ou nao
    res.status(401).json({ error: 'MFA_CHALLENGE_INVALID' });
    return;
  }

  const challenge = await prisma.mfaChallenge.findFirst({
    where: { challengeHash: hashChallengeId(challengeId), consumedAt: null },
    select: { user: { select: { email: true, id: true } } },
  });

  if (!challenge?.user) {
    res.status(401).json({ error: 'MFA_CHALLENGE_INVALID' });
    return;
  }

  try {
    await sendMfaEmail(challenge.user.email, regenerated.code);
  } catch (err) {
    console.error('[handleResendMfa] sendMfaEmail erro:', err);
    res.status(502).json({ error: 'MFA_EMAIL_FAILED' });
    return;
  }

  await logAuthEvent({
    req,
    event: 'AUTH_MFA_CHALLENGE_SENT',
    userId: challenge.user.id,
    metadata: { resend: true },
  });

  res.status(200).json({ expiresAt: regenerated.expiresAt.toISOString() });
}

/* =============================================================
 * 3. POST /api/auth/verify-mfa-and-login
 * ============================================================= */

interface VerifyMfaAndLoginBody {
  challengeId?: string;
  code?: string;
}

export async function handleVerifyMfaAndLogin(req: Request, res: Response): Promise<void> {
  const { challengeId, code } = (req.body ?? {}) as VerifyMfaAndLoginBody;

  if (!challengeId || !code || typeof challengeId !== 'string' || typeof code !== 'string') {
    res.status(400).json({ error: 'INVALID_INPUT' });
    return;
  }

  const outcome = await verifyMfaChallenge(challengeId, code);

  if (outcome.kind === 'NOT_FOUND' || outcome.kind === 'EXPIRED' || outcome.kind === 'CONSUMED') {
    await logAuthEvent({
      req,
      event: 'AUTH_MFA_FAILED',
      metadata: { kind: outcome.kind },
    });
    res.status(401).json({ error: 'MFA_CHALLENGE_INVALID' });
    return;
  }

  if (outcome.kind === 'EXHAUSTED') {
    await logAuthEvent({
      req,
      event: 'AUTH_MFA_EXHAUSTED',
      metadata: {},
    });
    res.status(429).json({ error: 'MFA_EXHAUSTED' });
    return;
  }

  if (outcome.kind === 'INVALID_CODE') {
    await logAuthEvent({
      req,
      event: 'AUTH_MFA_FAILED',
      metadata: { attemptsLeft: outcome.attemptsLeft },
    });
    res.status(401).json({ error: 'MFA_INVALID_CODE', attemptsLeft: outcome.attemptsLeft });
    return;
  }

  // outcome.kind === 'OK'
  const user = await prisma.user.findUnique({
    where: { id: outcome.userId },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    await logAuthEvent({
      req,
      event: 'AUTH_LOGIN_FAILURE',
      userId: outcome.userId,
      metadata: { reason: 'USER_GONE_OR_INACTIVE' },
    });
    res.status(403).json({ error: 'ACCOUNT_DISABLED' });
    return;
  }

  // Cria sessao + cookies
  try {
    const session = await issueSessionPair({
      userId: user.id,
      authMethod: 'google',
      acr: 'mfa', // RFC 9470: Google + email-based MFA = 2FA
      amr: ['pwd', 'otp'], // pwd = Google federated; otp = email code
      req,
      res,
    });

    await logAuthEvent({
      req,
      event: 'AUTH_LOGIN_SUCCESS',
      userId: user.id,
      metadata: {
        sessionId: session.sessionId,
        family: session.family,
        challengeRowId: outcome.challengeRowId,
      },
    });

    const { googleSub: _googleSub, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  } catch (err) {
    console.error('[handleVerifyMfaAndLogin] issueSessionPair erro:', err);
    res.status(500).json({ error: 'AUTH_INTERNAL_ERROR' });
  }
}

/* =============================================================
 * Helpers
 * ============================================================= */

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
