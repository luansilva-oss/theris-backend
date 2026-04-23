/**
 * Helpers para Set-Cookie de sessão com prefixo __Host-.
 *
 * Atributos (RFC 6265bis):
 * - __Host-: força Secure, Path=/, proíbe Domain (mitiga cookie tossing de subdomínio)
 * - HttpOnly: bloqueia leitura por JS (mitiga XSS)
 * - Secure: só transmite via HTTPS
 * - SameSite=Lax: cookie viaja em navegação top-level GET (incluso fluxo OAuth callback);
 *   bloqueia POST/PUT/DELETE cross-site (mitiga CSRF, complementado por double-submit token)
 * - Path=/: válido em toda a app (necessário pro prefixo __Host-)
 * - Priority=high: hint de retenção em cache (Chromium); irrelevante em outros browsers
 *
 * Em desenvolvimento (NODE_ENV !== 'production'), Secure=false porque Vite dev usa http://.
 * O prefixo __Host- exige Secure=true; em dev usamos cookie sem prefixo (theris_sid_dev) pra contornar.
 */

import type { CookieOptions, Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE = isProd ? '__Host-theris_sid' : 'theris_sid_dev';
export const REFRESH_COOKIE = isProd ? '__Host-theris_rt' : 'theris_rt_dev';
export const CSRF_COOKIE = isProd ? '__Host-theris_csrf' : 'theris_csrf_dev';

function baseAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    priority: 'high',
  };
}

export function setSessionCookie(res: Response, rawToken: string, maxAgeMs: number): void {
  res.cookie(SESSION_COOKIE, rawToken, { ...baseAuthCookieOptions(), maxAge: maxAgeMs });
}

export function setRefreshCookie(res: Response, rawToken: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE, rawToken, { ...baseAuthCookieOptions(), maxAge: maxAgeMs });
}

/** CSRF token NÃO é HttpOnly — frontend precisa lê-lo pra mandar no header. */
export function setCsrfCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(CSRF_COOKIE, token, {
    ...baseAuthCookieOptions(),
    httpOnly: false,
    maxAge: maxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts: CookieOptions = { ...baseAuthCookieOptions(), maxAge: 0 };
  res.cookie(SESSION_COOKIE, '', opts);
  res.cookie(REFRESH_COOKIE, '', opts);
  res.cookie(CSRF_COOKIE, '', { ...opts, httpOnly: false });
}
