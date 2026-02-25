/**
 * URL base da API do backend.
 * - Em desenvolvimento (localhost): usa http://localhost:3000
 * - Em produção: Vite injeta __VITE_API_URL__ no build (definir VITE_API_URL no deploy)
 *   Ex.: VITE_API_URL=https://theris-backend.onrender.com
 * Não usamos import.meta aqui para o tsc (backend) poder compilar este ficheiro.
 */
declare const __VITE_API_URL__: string | undefined;
const envUrl = typeof __VITE_API_URL__ !== 'undefined' ? __VITE_API_URL__ : '';
export const API_URL =
  (envUrl && String(envUrl).trim()) ||
  (typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? 'http://localhost:3000' : '') ||
  '';
