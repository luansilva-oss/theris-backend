/**
 * Geração e hash de tokens opacos para sessão/refresh.
 *
 * Modelo:
 * - Token bruto enviado ao cliente: 32 bytes random base64url (256 bits de entropia).
 * - Armazenamento no DB: HMAC-SHA-256(token, SESSION_PEPPER) em BYTEA.
 *   - HMAC com pepper protege contra exfiltração do banco (atacante precisa do pepper para
 *     reconstituir tokens — pepper fica em env var, fora do banco).
 *   - SHA-256 plain seria suficiente, mas pepper adiciona defesa em profundidade sem custo.
 * - Comparação: timing-safe via Buffer comparison.
 *
 * Refs: OWASP Session Management Cheat Sheet, NIST SP 800-63B-4.
 */

import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

const PEPPER_RAW = process.env.SESSION_PEPPER ?? '';
if (PEPPER_RAW.length < 32) {
  throw new Error(
    'SESSION_PEPPER inválido: defina env var com >=32 chars (gere com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))")',
  );
}
const PEPPER = Buffer.from(PEPPER_RAW, 'utf8');

export const TOKEN_BYTES = 32;
export const TOKEN_HASH_BYTES = 32; // SHA-256 output

/** Gera token opaco aleatório (32 bytes em base64url). */
export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Calcula HMAC-SHA-256(token, PEPPER) — usado pra armazenar/buscar no DB. */
export function hashToken(rawToken: string): Buffer {
  return createHmac('sha256', PEPPER).update(rawToken, 'utf8').digest();
}

/** Comparação timing-safe entre dois Buffers do MESMO tamanho. */
export function safeBufferEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
