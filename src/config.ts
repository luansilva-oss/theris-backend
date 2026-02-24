/**
 * URL base da API do backend.
 * - Em desenvolvimento (localhost): usa http://localhost:3000
 * - Em produção: usa VITE_API_URL (definir no .env.production ou nas env vars do deploy)
 *   Ex.: VITE_API_URL=https://theris-backend.onrender.com
 */
const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL;
export const API_URL =
  (envUrl && String(envUrl).trim()) ||
  (typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? 'http://localhost:3000' : '') ||
  '';
