/**
 * Cliente de API centralizado (frontend).
 *
 * Modo de autenticacao controlado por VITE_AUTH_MODE:
 *   - 'legacy' (default durante refactor): injeta header x-user-id, sem credentials,
 *      sem CSRF. Mantem compatibilidade com fluxo de login antigo (App.tsx atual).
 *   - 'cookie': nao injeta x-user-id, envia credentials (cookies httpOnly do backend),
 *      injeta CSRF token em mutacoes, intercepta 401 SESSION_EXPIRED_IDLE pra refresh
 *      automatico.
 *
 * Em producao, modo sera 'cookie'. Durante dev local, alterne via VITE_AUTH_MODE.
 *
 * Refs: refactor-auth bloco 6/16.
 */

import { API_URL } from '../config';

declare const __VITE_AUTH_MODE__: string | undefined;

type AuthMode = 'legacy' | 'cookie';

function resolveAuthMode(): AuthMode {
  const v = (typeof __VITE_AUTH_MODE__ !== 'undefined' ? __VITE_AUTH_MODE__ : 'legacy').toLowerCase();
  return v === 'cookie' ? 'cookie' : 'legacy';
}

const AUTH_MODE: AuthMode = resolveAuthMode();

/** Fallback quando o getter do React ainda não devolveu id (ex.: antes do primeiro commit com user). */
function readLegacyUserIdFromLocalStorage(): string | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem('theris_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { id?: string };
    return typeof parsed?.id === 'string' ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

let getUserIdFromState: (() => string | undefined) | null = null;
let onSessionExpired: (() => void) | null = null;

function resolveLegacyUserId(): string | undefined {
  const fromState = getUserIdFromState?.();
  if (fromState) return fromState;
  return readLegacyUserIdFromLocalStorage();
}

/** Setter de getter do userId (modo legacy). No-op em modo cookie. */
export function setUserIdGetter(getter: () => string | undefined) {
  getUserIdFromState = getter;
}

/** Callback chamado em SESSION_EXPIRED ou refresh failure. */
export function setSessionExpiredCallback(cb: (() => void) | null) {
  onSessionExpired = cb;
}

/** Verifica se URL pertence a nossa API (mesma origem ou API_URL). */
function isTherisApiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    if (url.startsWith('/')) return true;
    const u = new URL(url, window.location.origin);
    if (!API_URL || !API_URL.startsWith('http')) return u.origin === window.location.origin;
    const apiOrigin = new URL(API_URL).origin;
    return u.origin === apiOrigin || u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/* =============================================================
 * CSRF token cache (modo cookie)
 * ============================================================= */

let csrfTokenCache: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(originalFetch: typeof fetch): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const url = `${API_URL || ''}/api/auth/csrf`;
      const res = await originalFetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { csrfToken?: string };
      csrfTokenCache = data.csrfToken ?? null;
      return csrfTokenCache;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

function invalidateCsrfCache() {
  csrfTokenCache = null;
}

/* =============================================================
 * Refresh interceptor (modo cookie) — singleflight
 * ============================================================= */

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(originalFetch: typeof fetch): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const url = `${API_URL || ''}/api/auth/refresh`;
      const res = await originalFetch(url, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // Sessao rotacionada — invalida CSRF cache (token amarrado a session id)
        invalidateCsrfCache();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* =============================================================
 * Patch do fetch global
 * ============================================================= */

export function initApiClient() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch;

  window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : (input as URL).href;
    const opts: RequestInit = init ?? {};
    const headers = new Headers(opts.headers);
    const isApi = isTherisApiUrl(url);

    if (!isApi) {
      // Rotas externas: nao injeta nada
      return originalFetch.call(window, input, opts);
    }

    if (AUTH_MODE === 'legacy') {
      // === Modo legacy: injeta x-user-id, sem credentials, sem CSRF, sem refresh ===
      const userId = resolveLegacyUserId();
      if (userId) headers.set('x-user-id', userId);
      const res = await originalFetch.call(window, input, { ...opts, headers });
      if (res.status === 401) {
        try {
          const body = await res.clone().json();
          if (body?.error === 'SESSION_EXPIRED') onSessionExpired?.();
        } catch {
          // ignore
        }
      }
      return res;
    }

    // === Modo cookie: credentials, CSRF em mutacoes, refresh interceptor ===

    // Inject CSRF token em mutacoes
    const method = (opts.method ?? 'GET').toUpperCase();
    const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    const isCsrfEndpoint = url.includes('/api/auth/csrf');

    if (isMutation && !isCsrfEndpoint) {
      const csrf = await fetchCsrfToken(originalFetch as typeof fetch);
      if (csrf) headers.set('X-CSRF-Token', csrf);
    }

    // Primeira tentativa
    const initialReq: RequestInit = { ...opts, headers, credentials: 'include' };
    let res = await originalFetch.call(window, input, initialReq);

    // CSRF invalido: invalida cache, busca novo, tenta uma vez
    if (res.status === 403) {
      try {
        const body = await res.clone().json();
        if (body?.error === 'CSRF_INVALID' || body?.error === 'invalid csrf token') {
          invalidateCsrfCache();
          if (isMutation) {
            const csrf = await fetchCsrfToken(originalFetch as typeof fetch);
            const retryHeaders = new Headers(headers);
            if (csrf) retryHeaders.set('X-CSRF-Token', csrf);
            res = await originalFetch.call(window, input, {
              ...opts,
              headers: retryHeaders,
              credentials: 'include',
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // 401 SESSION_EXPIRED_IDLE: tenta refresh + replay (singleflight)
    if (res.status === 401) {
      let body: { error?: string } = {};
      try {
        body = await res.clone().json();
      } catch {
        // ignore
      }
      const errorCode = body?.error ?? '';

      // Codigos que disparam refresh automatico
      if (errorCode === 'SESSION_EXPIRED_IDLE' || errorCode === 'SESSION_MISSING') {
        const refreshed = await attemptRefresh(originalFetch as typeof fetch);
        if (refreshed) {
          // Replay com CSRF novo
          const replayHeaders = new Headers(opts.headers);
          if (isMutation && !isCsrfEndpoint) {
            const csrf = await fetchCsrfToken(originalFetch as typeof fetch);
            if (csrf) replayHeaders.set('X-CSRF-Token', csrf);
          }
          res = await originalFetch.call(window, input, {
            ...opts,
            headers: replayHeaders,
            credentials: 'include',
          });

          // Se replay tambem falha 401: chama onSessionExpired
          if (res.status === 401) {
            onSessionExpired?.();
          }
          return res;
        }
        // Refresh falhou: forca logout
        onSessionExpired?.();
        return res;
      }

      // Codigos terminais: forca logout
      if (
        errorCode === 'SESSION_EXPIRED_ABSOLUTE' ||
        errorCode === 'SESSION_REVOKED' ||
        errorCode === 'SESSION_INVALID' ||
        errorCode === 'REFRESH_REUSE_DETECTED' ||
        errorCode === 'REFRESH_INVALID' ||
        errorCode === 'REFRESH_MISSING' ||
        errorCode === 'SESSION_EXPIRED' /* compat legacy */
      ) {
        onSessionExpired?.();
      }
    }

    return res;
  };
}

/** Util pra App.tsx limpar cache no logout. */
export function clearApiClientCache() {
  csrfTokenCache = null;
  csrfFetchPromise = null;
  refreshPromise = null;
}

/** Retorna o modo atual (debug). */
export function getAuthMode(): AuthMode {
  return AUTH_MODE;
}
