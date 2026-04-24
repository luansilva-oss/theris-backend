/**
 * Handler de POST /api/auth/refresh.
 *
 * Rotação atômica do refresh token com reuse detection (RFC 9700 §4.14.2).
 *
 * Fluxo:
 *   1. Lê REFRESH_COOKIE.
 *   2. Em transação: busca refresh por tokenHash.
 *   3. Se já usado/inativo → REUSE → killFamily inteira + 401 + audit critico.
 *   4. Se válido → marca usado, mata sessão atual, cria nova Session+RefreshToken
 *      com a MESMA family e o MESMO absoluteExpiresAt (preserva teto absoluto).
 *
 * Nunca retorna o motivo exato pro cliente (apenas REFRESH_INVALID em casos
 * intermediários) pra não vazar info de timing/estado interno. REUSE retorna
 * REFRESH_REUSE_DETECTED pra frontend forçar logout limpo.
 */

import type { Request, Response } from 'express';
import { PrismaClient, SessionRevokeReason } from '@prisma/client';
import { hashToken } from './tokens';
import { REFRESH_COOKIE, clearAuthCookies } from './cookies';
import { issueSessionPair, killFamily } from './session';
import { logAuthEvent } from './auditAuth';

const prisma = new PrismaClient();

type Outcome =
  | { kind: 'NOT_FOUND' }
  | { kind: 'EXPIRED' }
  | { kind: 'REUSE'; userId: string; family: string }
  | {
      kind: 'ROTATE';
      userId: string;
      authMethod: string;
      family: string;
      inheritAbsolute: Date;
      acr: string;
      amr: string[];
    };

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'REFRESH_MISSING' });
    return;
  }

  let outcome: Outcome;

  try {
    outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash: hashToken(raw) },
        include: { session: true },
      });

      if (!existing || !existing.session) {
        return { kind: 'NOT_FOUND' as const };
      }

      // REUSE DETECTION: token já consumido ou inativo
      if (existing.usedAt !== null || !existing.isActive) {
        await killFamily(existing.family, 'REFRESH_REUSE', tx);
        return {
          kind: 'REUSE' as const,
          userId: existing.userId,
          family: existing.family,
        };
      }

      if (existing.expiresAt.getTime() < Date.now()) {
        return { kind: 'EXPIRED' as const };
      }

      const now = new Date();

      // Marca o RT atual como usado (impede replay)
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { usedAt: now, isActive: false },
      });

      // Mata a Session atual (será substituída pela nova logo abaixo, fora da TX)
      await tx.session.update({
        where: { id: existing.sessionId },
        data: {
          isActive: false,
          revokedAt: now,
          // Semântica "rotated"; tipo neutro até enum dedicado existir
          revokedReason: SessionRevokeReason.USER_LOGOUT,
        },
      });

      return {
        kind: 'ROTATE' as const,
        userId: existing.userId,
        authMethod: existing.session.authMethod,
        family: existing.family,
        inheritAbsolute: existing.session.absoluteExpiresAt,
        acr: existing.session.acr,
        amr: existing.session.amr,
      };
    });
  } catch (err) {
    console.error('[handleRefresh] tx erro:', err);
    clearAuthCookies(res);
    res.status(500).json({ error: 'REFRESH_FAILED' });
    return;
  }

  if (outcome.kind === 'NOT_FOUND' || outcome.kind === 'EXPIRED') {
    clearAuthCookies(res);
    await logAuthEvent({
      req,
      event: 'AUTH_REFRESH_INVALID',
      metadata: { reason: outcome.kind },
    });
    res.status(401).json({ error: 'REFRESH_INVALID' });
    return;
  }

  if (outcome.kind === 'REUSE') {
    clearAuthCookies(res);
    await logAuthEvent({
      req,
      event: 'AUTH_REFRESH_REUSE_DETECTED',
      userId: outcome.userId,
      metadata: { family: outcome.family, severity: 'critical' },
    });
    res.status(401).json({ error: 'REFRESH_REUSE_DETECTED' });
    return;
  }

  // ROTATE: cria nova Session+RT preservando family e absolute expiry
  try {
    await issueSessionPair({
      userId: outcome.userId,
      authMethod: outcome.authMethod,
      acr: outcome.acr,
      amr: outcome.amr,
      req,
      res,
      inheritFamily: outcome.family,
      inheritAbsoluteExpiresAt: outcome.inheritAbsolute,
    });
    await logAuthEvent({
      req,
      event: 'AUTH_REFRESH_SUCCESS',
      userId: outcome.userId,
      metadata: { family: outcome.family },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[handleRefresh] issueSessionPair erro:', err);
    clearAuthCookies(res);
    res.status(500).json({ error: 'REFRESH_FAILED' });
  }
}
