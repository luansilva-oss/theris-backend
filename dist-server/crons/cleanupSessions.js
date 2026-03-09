"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldSessions = cleanupOldSessions;
exports.startCleanupSessionsCron = startCleanupSessionsCron;
/**
 * Cron: limpeza de sessões antigas (24h) e tentativas de login antigas (90 dias).
 * Roda 1x por dia às 03:00 (horário de Brasília).
 */
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const CRON_SCHEDULE = '0 3 * * *'; // 03:00
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas
const LOGIN_ATTEMPT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
function cleanupOldSessions() {
    const timestamp = new Date().toISOString();
    return (async () => {
        let sessionsDeleted = 0;
        let loginAttemptsDeleted = 0;
        const sessionThreshold = new Date(Date.now() - SESSION_MAX_AGE_MS);
        const sessionResult = await prisma.session.deleteMany({
            where: { lastActivity: { lt: sessionThreshold } },
        });
        sessionsDeleted = sessionResult.count;
        console.log(`[CLEANUP] ${sessionsDeleted} sessões expiradas removidas em ${timestamp}`);
        const loginAttemptThreshold = new Date(Date.now() - LOGIN_ATTEMPT_MAX_AGE_MS);
        const loginAttemptResult = await prisma.loginAttempt.deleteMany({
            where: { createdAt: { lt: loginAttemptThreshold } },
        });
        loginAttemptsDeleted = loginAttemptResult.count;
        console.log(`[CLEANUP] ${loginAttemptsDeleted} tentativas de login antigas removidas.`);
        return { sessionsDeleted, loginAttemptsDeleted };
    })();
}
function startCleanupSessionsCron() {
    node_cron_1.default.schedule(CRON_SCHEDULE, async () => {
        console.log('🕐 [Cron] Executando limpeza de sessões e tentativas de login...');
        try {
            await cleanupOldSessions();
        }
        catch (e) {
            console.error('[CLEANUP] Erro:', e);
        }
    }, { timezone: 'America/Sao_Paulo' });
}
