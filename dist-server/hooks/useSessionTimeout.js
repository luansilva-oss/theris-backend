"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionTimeout = useSessionTimeout;
const react_1 = require("react");
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll'];
/**
 * Monitora inatividade e chama onExpire após 60 min sem atividade.
 * Reseta o timer a cada mousemove, keydown, click ou scroll.
 * Quando enabled === false (ex: não logado), o timer não é ativado.
 */
function useSessionTimeout(onExpire, options = {}) {
    const { enabled = true } = options;
    const timerRef = (0, react_1.useRef)(null);
    const onExpireRef = (0, react_1.useRef)(onExpire);
    onExpireRef.current = onExpire;
    const resetTimer = (0, react_1.useCallback)(() => {
        if (!enabled)
            return;
        if (timerRef.current)
            clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            onExpireRef.current();
        }, SESSION_TIMEOUT_MS);
    }, [enabled]);
    (0, react_1.useEffect)(() => {
        if (!enabled) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        resetTimer();
        const handler = () => resetTimer();
        ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
        return () => {
            ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handler));
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [enabled, resetTimer]);
}
