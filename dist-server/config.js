"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_URL = void 0;
const envUrl = typeof __VITE_API_URL__ !== 'undefined' ? __VITE_API_URL__ : '';
exports.API_URL = (envUrl && String(envUrl).trim()) ||
    (typeof window !== 'undefined' && window.location?.hostname === 'localhost' ? 'http://localhost:3000' : '') ||
    '';
