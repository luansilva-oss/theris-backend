import express, { Request, Response } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// --- IMPORTAÇÕES DOS CONTROLADORES ---
import {
  createSolicitacao,
  getSolicitacoes,
  getMyTickets,
  updateSolicitacao,
  getSolicitacaoById,
  updateSolicitacaoMetadata,
  createComment,
  createAttachment,
  exportRequestsCsv
} from './controllers/solicitacaoController';
import { googleLogin, sendMfa, verifyMfa } from './controllers/authController';
import { getTools, createTool, updateTool, deleteTool, getToolGroups, createToolGroup, deleteToolGroup, addToolAccess, removeToolAccess, updateToolAccess, updateToolLevel } from './controllers/toolController';
import { getAllUsers, getMe, getUserById, getUserDetails, getMyTools, manualAddUser, updateUser, deleteUser, markPasswordChanged } from './controllers/userController';
import { resetCatalog, getLoginAttempts, getSessions, revokeSession, revokeAllSessions } from './controllers/adminController';
import { checkSessionTimeout } from './middleware/sessionTimeout';
import * as structureController from './controllers/structureController';
import { getAuditLog } from './controllers/auditLogController';
import { syncStructureFromUsers } from './services/structureSync'; // Import sync service
import { startPasswordReminderCron } from './jobs/passwordReminderCron';
import { startCleanupSessionsCron } from './crons/cleanupSessions';

// Slack
import { slackReceiver, getToolsAndLevelsMap } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- HTTPS FORÇADO (produção: redirecionar HTTP → HTTPS) ---
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  const isHttps = proto === 'https' || (Array.isArray(proto) && proto[0] === 'https');
  if (process.env.NODE_ENV === 'production' && !isHttps) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// --- SECURITY HEADERS (landing e todas as respostas) ---
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https: wss:; " +
    "frame-src 'self' https://accounts.google.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self';"
  );
  next();
});

// Auto-sync structure on startup
syncStructureFromUsers();

// Cron: lembrete de troca de senha a cada 90 dias (DM Slack às 09:00)
startPasswordReminderCron();
// Cron: limpeza de sessões (> 24h) e tentativas de login (> 90 dias), 1x/dia às 03:00 (Brasília)
startCleanupSessionsCron();

// --- CORS ---
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://theris.grupo-3c.com',
    'https://theris-backend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

// ⚠️ ROTA DO SLACK
// Ignorar retries do Slack (evita processar duas vezes e disparos indevidos)
app.use('/api/slack', (req, res, next) => {
  const retryReason = req.headers['x-slack-retry-reason'];
  if (retryReason) {
    console.log('[Slack] Ignorando retry:', retryReason);
    return res.status(200).send();
  }
  next();
});
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE (limite maior para upload base64 de anexos) ---
app.use(express.json({ limit: '15mb' }));

// ============================================================
// --- RATE LIMITING (auth: anti brute-force) ---
// ============================================================
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15, // login + send-mfa + verify-mfa + algumas tentativas
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/login', authRateLimiter);
app.use('/api/auth', authRateLimiter);

// ============================================================
// --- ROTAS DE AUTENTICAÇÃO ---
// ============================================================
app.post('/api/login/google', googleLogin);
app.post('/api/auth/send-mfa', sendMfa);
app.post('/api/auth/verify-mfa', verifyMfa);

// ============================================================
// --- SESSION TIMEOUT (60 min inatividade) — rotas autenticadas ---
// ============================================================
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith('/api/login') || p.startsWith('/api/auth') || p.startsWith('/api/slack') || p.startsWith('/api/webhooks')) return next();
  checkSessionTimeout(req, res, next);
});

// ============================================================
// --- ROTAS ADMINISTRATIVAS ---
// ============================================================
app.get('/api/admin/reset-tools', resetCatalog);
app.get('/api/admin/login-attempts', getLoginAttempts);
app.get('/api/admin/sessions', getSessions);
app.delete('/api/admin/sessions/:userId', revokeSession);
app.delete('/api/admin/sessions', revokeAllSessions);

// ============================================================
// --- ROTAS DE DADOS ---
// ============================================================

// 1. Estrutura (rotas de units antes de departments para não capturar :id em "units")
app.get('/api/structure', structureController.getStructure);
app.post('/api/structure/units', structureController.createUnit);
app.put('/api/structure/units/:id', structureController.updateUnit);
app.delete('/api/structure/units/:id', structureController.deleteUnit);
app.post('/api/structure/units/:id/migrate-and-delete', structureController.migrateAndDeleteUnit);

app.post('/api/structure/departments', structureController.createDepartment);
app.get('/api/structure/departments/:id/user-count', structureController.getDepartmentUserCount);
app.put('/api/structure/departments/:id', structureController.updateDepartment);
app.delete('/api/structure/departments/:id', structureController.deleteDepartment);

app.post('/api/structure/roles', structureController.createRole);
app.put('/api/structure/roles/:id', structureController.updateRole);
app.delete('/api/structure/roles/:id', structureController.deleteRole);
app.get('/api/structure/roles/:id/kit', structureController.getRoleKit);
app.put('/api/structure/roles/:id/kit', structureController.updateRoleKit);

app.get('/api/audit-log', getAuditLog);

// 2. Ferramentas
app.get('/api/tools', getTools);
app.get('/api/tools-and-levels', (_req: Request, res: Response) => res.json(getToolsAndLevelsMap()));
app.post('/api/tools', createTool);
app.put('/api/tools/:id', updateTool); // Atualizar ferramenta (Grupo, Owner, Níveis)
app.delete('/api/tools/:id', deleteTool); // EXCLUIR FERRAMENTA

app.get('/api/tool-groups', getToolGroups);
app.post('/api/tool-groups', createToolGroup);
app.delete('/api/tool-groups/:id', deleteToolGroup);

app.post('/api/tools/:id/access', addToolAccess);     // Adicionar/Atualizar acesso de usuário
app.delete('/api/tools/:id/access/:userId', removeToolAccess); // Remover acesso
import { deleteToolLevel } from './controllers/toolController'; // Helper import if needed, but better to update top import
app.patch('/api/tools/:toolId/level/:oldLevelName', updateToolLevel);
app.delete('/api/tools/:toolId/level/:levelName', deleteToolLevel);
app.patch('/api/tools/:toolId/access/:userId', updateToolAccess); // Atualizar detalhes do acesso (ex: extra)

// 3. Usuários (rotas específicas antes de /:id)
app.get('/api/users', getAllUsers);
app.get('/api/users/me', getMe);
app.get('/api/users/me/tools', getMyTools);
app.post('/api/users/manual-add', manualAddUser);
app.get('/api/users/:id/details', getUserDetails);
app.get('/api/users/:id', getUserById);
app.put('/api/users/:id', updateUser);
app.patch('/api/users/:id/password-changed', markPasswordChanged);
app.delete('/api/users/:id', deleteUser);

// ============================================================
// --- INTEGRAÇÃO CONVENIA ---
// ============================================================
import { handleConveniaWebhook } from './controllers/conveniaController';
app.post('/api/webhooks/convenia', handleConveniaWebhook);

// ============================================================
// --- WORKFLOW (SOLICITAÇÕES) ---
// ============================================================
app.get('/api/requests/export/csv', exportRequestsCsv);
app.get('/api/solicitacoes', getSolicitacoes);
app.get('/api/solicitacoes/my-tickets', getMyTickets);
app.get('/api/solicitacoes/:id', getSolicitacaoById);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id/metadata', updateSolicitacaoMetadata);
app.post('/api/solicitacoes/:id/comments', createComment);
app.post('/api/solicitacoes/:id/attachments', createAttachment);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// ============================================================
// --- SERVIR FRONTEND ---
// ============================================================
const frontendPath = path.resolve(__dirname, '../dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
});