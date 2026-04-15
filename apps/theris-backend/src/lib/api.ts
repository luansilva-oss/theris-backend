/**
 * Cliente de API centralizado (frontend apenas).
 * Injeta x-user-id automaticamente em requisições para a API do Theris.
 *
 * Todas as chamadas fetch() no frontend usam o fetch global (patchado aqui), portanto
 * x-user-id é enviado em todas as requisições autenticadas para a nossa API quando
 * getUserId() retorna valor (definido em App quando currentUser está logado).
 *
 * Guardas:
 * - Só injeta para same-origin ou URL da nossa API (não envia para Google, Stripe, etc.)
 * - Não altera Content-Type (preserva boundary de multipart/form-data em uploads)
 * - typeof window guard: backend (Node) não executa o patch
 *
 * x-user-id: identifica quem está logado e executou a ação (auditoria, autorização, sessão).
 * O backend usa x-requester-id como alias; enviamos x-user-id que atende ambos.
 */

import { API_URL } from '../config';

let getUserId: (() => string | undefined) | null = null;
let onSessionExpired: (() => void) | null = null;

/** Define o getter do ID do usuário logado (chamar em App quando currentUser mudar). */
export function setUserIdGetter(getter: () => string | undefined) {
  getUserId = getter;
}

/** Define callback para 401 SESSION_EXPIRED (chamar em App: limpar auth e redirecionar para /login). */
export function setSessionExpiredCallback(cb: (() => void) | null) {
  onSessionExpired = cb;
}

/** Verifica se a URL é da nossa API (não injeta headers em chamadas externas). */
function isTherisApiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    if (url.startsWith('/')) return true; // same-origin relative
    const u = new URL(url, window.location.origin);
    if (!API_URL || !API_URL.startsWith('http')) return u.origin === window.location.origin;
    const apiOrigin = new URL(API_URL).origin;
    return u.origin === apiOrigin || u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Inicializa o patch do fetch global. Chamar em main.tsx. */
export function initApiClient() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : (input as URL).href;
    const opts = init ?? {};
    const headers = new Headers(opts.headers);
    // Só injeta para nossa API; não altera Content-Type (preserva multipart boundary)
    if (isTherisApiUrl(url)) {
      const userId = getUserId?.();
      if (userId) headers.set('x-user-id', userId);
    }
    return originalFetch.call(window, input, { ...opts, headers }).then((res) => {
      if (res.status === 401 && isTherisApiUrl(url)) {
        res.clone().json().then((body: { error?: string }) => {
          if (body?.error === 'SESSION_EXPIRED') onSessionExpired?.();
        }).catch(() => {});
      }
      return res;
    });
  };
}
