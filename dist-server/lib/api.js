"use strict";
/**
 * Cliente de API centralizado.
 * Injeta x-user-id automaticamente em todas as requisições fetch
 * para auditoria (HistoricoMudanca) e identificação do usuário logado.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserIdGetter = setUserIdGetter;
exports.initApiClient = initApiClient;
let getUserId = null;
/** Define o getter do ID do usuário logado (chamar em App quando currentUser mudar). */
function setUserIdGetter(getter) {
    getUserId = getter;
}
/** Inicializa o patch do fetch global para adicionar x-user-id. Chamar em main.tsx. */
function initApiClient() {
    if (typeof window === 'undefined')
        return;
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.href;
        const opts = init ?? {};
        const headers = new Headers(opts.headers);
        const userId = getUserId?.();
        if (userId) {
            headers.set('x-user-id', userId);
            headers.set('x-requester-id', userId);
        }
        return originalFetch.call(window, input, { ...opts, headers });
    };
}
