/**
 * MfaChallenge: estado intermediario entre Google login validado e MFA confirmado.
 *
 * Sessao real so nasce apos verifyMfaChallenge OK (handler em loginHandlers.ts).
 * Bypass via localStorage impossivel — nao ha estado de auth no cliente ate
 * cookie ser setado.
 *
 * Codigo MFA e challengeId hasheados via HMAC com peppers derivados do
 * SESSION_PEPPER + label (domain separation: HMAC com label fixo nunca colide
 * com hashes de outros dominios).
 */

import { createHmac, randomInt } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { generateOpaqueToken } from './tokens';

const prisma = new PrismaClient();

const SESSION_PEPPER_RAW = process.env.SESSION_PEPPER ?? '';
if (SESSION_PEPPER_RAW.length < 32) {
  throw new Error('SESSION_PEPPER nao configurado');
}
const SESSION_PEPPER = Buffer.from(SESSION_PEPPER_RAW, 'utf8');

// Domain separation: peppers derivados pro contexto MFA
// Se um dia precisar rotacionar so o pepper MFA, basta mudar o label v1 -> v2
const MFA_CHALLENGE_PEPPER = createHmac('sha256', SESSION_PEPPER).update('mfa-challenge-v1').digest();
const MFA_CODE_PEPPER = createHmac('sha256', SESSION_PEPPER).update('mfa-code-v1').digest();

const CHALLENGE_TTL_MS = 10 * 60_000; // 10 min
const MFA_MAX_ATTEMPTS = 5;
const CODE_LENGTH = 6;

export function hashChallengeId(challengeId: string): Buffer {
  return createHmac('sha256', MFA_CHALLENGE_PEPPER).update(challengeId, 'utf8').digest();
}

export function hashCode(code: string): Buffer {
  return createHmac('sha256', MFA_CODE_PEPPER).update(code, 'utf8').digest();
}

/** Gera codigo de 6 digitos uniformemente aleatorio (CSPRNG). */
export function generateMfaCode(): string {
  // randomInt(0, 1_000_000) gera [0, 999999] uniforme; padStart cobre leading zeros
  return randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, '0');
}

export interface CreateMfaChallengeResult {
  challengeId: string; // Opaco enviado pro frontend
  code: string; // Plaintext apenas pra envio por email — NUNCA persistir
  expiresAt: Date;
  challengeRowId: string; // ID da row pra logging
}

export interface CreateMfaChallengeInput {
  userId: string;
  ipHash: Buffer | null;
  uaHash: Buffer | null;
}

/**
 * Cria MfaChallenge novo. Tambem invalida challenges anteriores nao-consumidos
 * do mesmo user (anti-acumulo: se user reiniciou login, o challenge antigo morre).
 */
export async function createMfaChallenge(input: CreateMfaChallengeInput): Promise<CreateMfaChallengeResult> {
  const challengeId = generateOpaqueToken(); // 32 bytes base64url
  const code = generateMfaCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

  const result = await prisma.$transaction(async (tx) => {
    // Invalida challenges anteriores nao-consumidos do mesmo user
    await tx.mfaChallenge.updateMany({
      where: { userId: input.userId, consumedAt: null },
      data: { consumedAt: now, attemptsLeft: 0 },
    });

    const created = await tx.mfaChallenge.create({
      data: {
        challengeHash: hashChallengeId(challengeId),
        userId: input.userId,
        codeHash: hashCode(code),
        attemptsLeft: MFA_MAX_ATTEMPTS,
        ipHash: input.ipHash,
        uaHash: input.uaHash,
        expiresAt,
      },
      select: { id: true },
    });

    return created;
  });

  return {
    challengeId,
    code,
    expiresAt,
    challengeRowId: result.id,
  };
}

export interface RegenerateCodeResult {
  code: string;
  expiresAt: Date;
}

/**
 * Gera novo codigo pro mesmo challenge (caso do user pedir reenvio).
 * Mantem challengeId e attemptsLeft, atualiza codeHash e estende expiresAt.
 */
export async function regenerateMfaCode(challengeId: string): Promise<RegenerateCodeResult | null> {
  const code = generateMfaCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);

  const updated = await prisma.mfaChallenge.updateMany({
    where: {
      challengeHash: hashChallengeId(challengeId),
      consumedAt: null,
      // Permite regenerar mesmo se passou da expiracao original (estende)
    },
    data: {
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  if (updated.count === 0) return null;

  return { code, expiresAt };
}

export type VerifyMfaOutcome =
  | { kind: 'OK'; userId: string; challengeRowId: string }
  | { kind: 'NOT_FOUND' }
  | { kind: 'EXPIRED' }
  | { kind: 'CONSUMED' }
  | { kind: 'EXHAUSTED' }
  | { kind: 'INVALID_CODE'; attemptsLeft: number };

/**
 * Verifica codigo MFA. Em transacao atomica:
 *   - Busca challenge por challengeHash
 *   - Valida estado (existe, nao consumido, nao expirado, attemptsLeft > 0)
 *   - Compara codeHash (timing-safe via Prisma equality)
 *   - Se OK: marca consumedAt → impede reutilizacao
 *   - Se INVALID: decrementa attemptsLeft
 */
export async function verifyMfaChallenge(challengeId: string, code: string): Promise<VerifyMfaOutcome> {
  if (!challengeId || !code) {
    return { kind: 'NOT_FOUND' };
  }

  const challengeHash = hashChallengeId(challengeId);
  const codeHashAttempt = hashCode(code);

  return prisma.$transaction(async (tx) => {
    const challenge = await tx.mfaChallenge.findUnique({
      where: { challengeHash },
      select: {
        id: true,
        userId: true,
        codeHash: true,
        attemptsLeft: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!challenge) return { kind: 'NOT_FOUND' as const };
    if (challenge.consumedAt !== null) return { kind: 'CONSUMED' as const };
    if (challenge.expiresAt.getTime() < Date.now()) return { kind: 'EXPIRED' as const };
    if (challenge.attemptsLeft <= 0) return { kind: 'EXHAUSTED' as const };

    // Comparacao timing-safe via Buffer.equals (constant-time pra Buffers do mesmo tamanho)
    const codeOk =
      Buffer.isBuffer(challenge.codeHash) &&
      challenge.codeHash.length === codeHashAttempt.length &&
      challenge.codeHash.equals(codeHashAttempt);

    if (!codeOk) {
      const newAttemptsLeft = challenge.attemptsLeft - 1;
      await tx.mfaChallenge.update({
        where: { id: challenge.id },
        data: { attemptsLeft: newAttemptsLeft },
      });
      return { kind: 'INVALID_CODE' as const, attemptsLeft: newAttemptsLeft };
    }

    // Sucesso: marca consumedAt (impede reutilizacao do mesmo codigo)
    await tx.mfaChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return {
      kind: 'OK' as const,
      userId: challenge.userId,
      challengeRowId: challenge.id,
    };
  });
}
