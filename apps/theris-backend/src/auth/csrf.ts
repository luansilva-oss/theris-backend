/**
 * CSRF Protection — double-submit cookie pattern.
 *
 * Lib: csrf-csrf v4 (sucessor do `csurf` deprecated desde 2022).
 *
 * Defesa em profundidade junto com SameSite=Lax (mesmo SameSite=Lax já bloqueia
 * a maioria dos vetores CSRF em browsers modernos, double-submit oferece
 * camada extra para casos de bypass de SameSite ou clientes não-browser).
 *
 * Fluxo:
 *   1. Frontend chama GET /api/auth/csrf → backend retorna { csrfToken } e
 *      seta CSRF_COOKIE (não-HttpOnly, frontend lê).
 *   2. Frontend envia o token no header X-CSRF-Token em mutações
 *      (POST/PUT/PATCH/DELETE).
 *   3. doubleCsrfProtection middleware compara header com cookie + secret.
 *   4. GET/HEAD/OPTIONS são ignorados (idempotentes, sem CSRF).
 *
 * O token é HMAC do session-identifier + secret, então rota a cada nova sessão.
 */

import { doubleCsrf } from 'csrf-csrf';
import type { HttpError } from 'http-errors';
import type { Request } from 'express';
import { CSRF_COOKIE, SESSION_COOKIE } from './cookies';

const CSRF_SECRET = process.env.CSRF_SECRET ?? '';
if (CSRF_SECRET.length < 32) {
  throw new Error('CSRF_SECRET inválido: defina env var com >=32 chars');
}

const isProd = process.env.NODE_ENV === 'production';

const csrf = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  // Identificador único por sessão: amarra o token CSRF à sessão atual
  // Se sessão muda (login/logout/refresh), token CSRF anterior fica inválido
  getSessionIdentifier: (req: Request) => {
    const sid = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? '';
    if (sid) return sid;
    // Pre-login: usa IP como fallback (token CSRF pré-login só vale na sessão de IP)
    return `anon:${req.ip ?? 'unknown'}`;
  },
  cookieName: CSRF_COOKIE,
  cookieOptions: {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // IncomingHttpHeaders pode ser string | string[]; evitar colisão com augmentation de csrf-csrf
  getCsrfTokenFromRequest: (req: Request) => {
    const raw = req.headers['x-csrf-token'] as string | string[] | undefined;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw[0];
    return '';
  },
});

export const generateCsrfToken = csrf.generateCsrfToken;
export const doubleCsrfProtection = csrf.doubleCsrfProtection;
/** Tipagem explícita evita TS4023 (nome `HttpError` não exportável no bundle). */
export const invalidCsrfTokenError: HttpError = csrf.invalidCsrfTokenError;
