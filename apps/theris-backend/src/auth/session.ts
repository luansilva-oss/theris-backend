/**
 * Helpers de criação e revogação de sessão.
 *
 * issueSessionPair:
 *   - Gera Session + RefreshToken atômicos (mesma family).
 *   - Seta cookies de sessão e refresh.
 *   - Retorna { session, refreshToken } pra audit/log.
 *
 * killFamily:
 *   - Marca como inativo TODAS as Sessions e RefreshTokens com a family informada.
 *   - Usado em: logout, refresh reuse detection, password change, admin revoke.
 *   - Idempotente: re-execução não causa erro.
 */

import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaClient, SessionRevokeReason } from '@prisma/client';
import { generateOpaqueToken, hashToken } from './tokens';
import { setSessionCookie, setRefreshCookie } from './cookies';
import { hashForAudit } from './auditAuth';

const prisma = new PrismaClient();

const IDLE_MS = Number(process.env.SESSION_IDLE_MINUTES ?? 30) * 60_000;
const ABSOLUTE_MS = Number(process.env.SESSION_ABSOLUTE_HOURS ?? 12) * 3_600_000;

interface IssueSessionParams {
  userId: string;
  authMethod?: string;
  acr?: string;
  amr?: string[];
  req: Request;
  res: Response;
  /** Para rotação de refresh: passa a family original pra manter cadeia. */
  inheritFamily?: string;
  /** Para rotação: preserva o teto absoluto original (não estende sessão indefinidamente). */
  inheritAbsoluteExpiresAt?: Date;
}

interface IssueSessionResult {
  sessionId: string;
  family: string;
  refreshTokenId: string;
}

/** Cria Session + RefreshToken e seta cookies. Retorna metadata pra logging. */
export async function issueSessionPair(params: IssueSessionParams): Promise<IssueSessionResult> {
  const {
    userId,
    authMethod = 'google',
    acr = 'pwd',
    amr = ['pwd'],
    req,
    res,
    inheritFamily,
    inheritAbsoluteExpiresAt,
  } = params;

  const family = inheritFamily ?? randomUUID();
  const now = new Date();
  const absoluteExpiresAt = inheritAbsoluteExpiresAt ?? new Date(now.getTime() + ABSOLUTE_MS);
  const idleExpiresAt = new Date(now.getTime() + IDLE_MS);

  const sessionTokenRaw = generateOpaqueToken();
  const refreshTokenRaw = generateOpaqueToken();

  const ipHashHex = hashForAudit(req.ip ?? req.socket?.remoteAddress ?? null);
  const uaHashHex = hashForAudit((req.get('user-agent') ?? '').slice(0, 256));

  // Próxima generation: se inheritFamily, soma 1 ao max(generation) existente; senão 0.
  let nextGeneration = 0;
  if (inheritFamily) {
    const max = await prisma.refreshToken.aggregate({
      where: { family },
      _max: { generation: true },
    });
    nextGeneration = (max._max.generation ?? -1) + 1;
  }

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        tokenHash: hashToken(sessionTokenRaw),
        userId,
        family,
        authMethod,
        acr,
        amr,
        authTime: now,
        idleExpiresAt,
        absoluteExpiresAt,
        ipHash: ipHashHex ? Buffer.from(ipHashHex, 'hex') : null,
        uaHash: uaHashHex ? Buffer.from(uaHashHex, 'hex') : null,
      },
    });
    const refresh = await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshTokenRaw),
        sessionId: session.id,
        userId,
        family,
        generation: nextGeneration,
        expiresAt: absoluteExpiresAt,
      },
    });
    return { sessionId: session.id, refreshTokenId: refresh.id };
  });

  setSessionCookie(res, sessionTokenRaw, IDLE_MS);
  setRefreshCookie(res, refreshTokenRaw, absoluteExpiresAt.getTime() - now.getTime());

  return {
    sessionId: created.sessionId,
    family,
    refreshTokenId: created.refreshTokenId,
  };
}

/** Revoga TODAS as Sessions e RefreshTokens de uma family. Idempotente. */
export async function killFamily(
  family: string,
  reason: SessionRevokeReason,
  txClient?: Prisma.TransactionClient,
): Promise<void> {
  const client = txClient ?? prisma;
  const now = new Date();
  await client.refreshToken.updateMany({
    where: { family, isActive: true },
    data: { isActive: false },
  });
  await client.session.updateMany({
    where: { family, isActive: true },
    data: { isActive: false, revokedAt: now, revokedReason: reason },
  });
}

/** Revoga TODAS as Sessions ativas de um user (inclui múltiplas families). */
export async function killAllUserSessions(
  userId: string,
  reason: SessionRevokeReason,
): Promise<{ sessionsRevoked: number; refreshTokensRevoked: number }> {
  const now = new Date();
  const [sessRes, rtRes] = await prisma.$transaction([
    prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, revokedAt: now, revokedReason: reason },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    }),
  ]);
  return { sessionsRevoked: sessRes.count, refreshTokensRevoked: rtRes.count };
}
