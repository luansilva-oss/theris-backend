import { useEffect, useRef, useCallback } from 'react';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll'] as const;

export type OnSessionExpired = () => void;

export type UseSessionTimeoutOptions = { enabled?: boolean };

/**
 * Monitora inatividade e chama onExpire após 60 min sem atividade.
 * Reseta o timer a cada mousemove, keydown, click ou scroll.
 * Quando enabled === false (ex: não logado), o timer não é ativado.
 */
export function useSessionTimeout(
  onExpire: OnSessionExpired,
  options: UseSessionTimeoutOptions = {}
): void {
  const { enabled = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onExpireRef.current();
    }, SESSION_TIMEOUT_MS);
  }, [enabled]);

  useEffect(() => {
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
