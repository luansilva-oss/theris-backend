import express, { Request, Response } from 'express';
import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
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
  exportRequestsCsv,
  patchRequestAssignee,
  patchRequestInbox,
  confirmJcSuspension
} from './controllers/solicitacaoController';
import { getRootAccessReport, getRootAccessDetail } from './controllers/rootAccessReportController';
import { postRevokeRootAccessRequest, getRootAccessExportCsv } from './controllers/rootAccessOpsController';
import { googleLogin, sendMfa, verifyMfa } from './controllers/authController';
import {
  getTools,
  createTool,
  updateTool,
  deleteTool,
  getToolGroups,
  createToolGroup,
  deleteToolGroup,
  addToolAccess,
  removeToolAccess,
  updateToolAccess,
  updateToolLevel,
  deleteToolLevel,
  createToolAccessLevel,
  updateToolAccessLevel,
  deleteToolAccessLevel
} from './controllers/toolController';
import { getKbu, putKbu, postKbu, deleteKbu } from './controllers/kbuController';
import { getAllUsers, getMe, getUserById, getUserDetails, getMyTools, manualAddUser, updateUser, deleteUser, markPasswordChanged, searchUsersForAutocomplete } from './controllers/userController';
import {
  resetCatalog,
  getLoginAttempts,
  getSessions,
  revokeSession,
  revokeAllSessions,
  postValidateAexSync
} from './controllers/adminController';
import { checkSessionTimeout } from './middleware/sessionTimeout';
import { requireAuth } from './middleware/auth';
import * as structureController from './controllers/structureController';
import { getAuditLog } from './controllers/auditLogController';
import { syncStructureFromUsers } from './services/structureSync'; // Import sync service
import { startPasswordReminderCron } from './jobs/passwordReminderCron';
import { startCleanupSessionsCron } from './crons/cleanupSessions';
import { startReviewAccessCron } from './crons/reviewAccessCron';
import { startJumpCloudRootAccessExpiryCron } from './crons/jumpcloudRootAccessExpiryCron';
import { startJumpCloudPasswordCron } from './crons/jumpcloudPasswordCron';
import { startJumpCloudPasswordExpiryCron } from './crons/jumpcloudPasswordExpiryCron';
import { startOnboardingSlackActionDateCron } from './crons/onboardingSlackActionDateCron';
import { startJumpCloudDivergenceCron } from './jobs/jumpcloudDivergenceCheck';
import { startValidateAexToolSyncCron } from './jobs/validateAexToolSync';
import { startExpireExtraordinaryAccessCron } from './jobs/expireExtraordinaryAccess';
import { startMonthlyJcOffboardingReconciliationCron } from './jobs/monthlyJcOffboardingReconciliation';
import { startDailyOwnersLeaverNotificationsCron } from './jobs/dailyOwnersLeaverNotifications';
import { startRecertifyExtraordinaryAccessCron } from './jobs/recertifyExtraordinaryAccess';
import webhookRouter from './routes/webhooks';
import { requireServiceToken } from './middleware/requireServiceToken';
import { getUsers, getUserByEmail, getSiMembers, getBoardMembers, verifyToken } from './controllers/sgsiIntegrationController';

// Slack
import { slackReceiver } from './services/slackService';
import { buildToolsAndLevelsMap } from './lib/buildToolsAndLevelsMap';
import { logJumpCloudAuthBootstrap } from './services/jumpcloudAuth';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

logJumpCloudAuthBootstrap();

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
// Cron: revisão periódica de acessos (90 dias), 1x/dia às 09:00 (Brasília)
startReviewAccessCron();
// Cron: JumpCloud Password Manager (eventos view/copy), a cada 5 min
startJumpCloudPasswordCron();
startJumpCloudRootAccessExpiryCron();
// Cron: JumpCloud senha expirando em 7 dias, 1x/dia às 08:00 (Brasília)
startJumpCloudPasswordExpiryCron();
// Cron: lembrete data de ação Slack (onboarding HIRING aprovado), diário 08:30 BRT
startOnboardingSlackActionDateCron();
// Cron: divergências Employment Theris × JumpCloud, segundas às 08:00 (Brasília)
startJumpCloudDivergenceCron();
// Cron: validação catálogo ap_* × grupos JumpCloud, segundas às 08:30 (Brasília)
startValidateAexToolSyncCron();
// Cron: recertificação AEX (90d + 2d), diariamente às 07:30 (Brasília)
startRecertifyExtraordinaryAccessCron();
// Cron: expiração automática de AEX (Theris + JumpCloud), diariamente às 08:00 (Brasília)
startExpireExtraordinaryAccessCron();
// Cron: reconciliação mensal Theris (inativos) × JumpCloud (conta ativa), dia 1 às 09:00 BRT
startMonthlyJcOffboardingReconciliationCron();
// Cron: notificação Owners (Leaver) agendada, diariamente às 17:00 BRT
startDailyOwnersLeaverNotificationsCron();

// --- CORS ---
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://theris.grupo-3c.com',
    'https://theris-backend.onrender.com',
    'https://sgsi-frontend.onrender.com'
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
app.use('/webhooks', webhookRouter);

// --- JSON MIDDLEWARE (limite maior para upload base64 de anexos) ---
app.use(express.json({ limit: '15mb' }));

// ============================================================
// --- RATE LIMITING ---
// ============================================================
// Geral: 100 req/min por IP em todas as rotas /api
const apiGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em um minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1'),
});
app.use('/api', apiGeneralLimiter);

// Auth: 300 req/15min por IP, só falhas contam (login/MFA)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1'),
});
app.use('/api/login', authRateLimiter);
app.use('/api/auth', authRateLimiter);

// ============================================================
// --- ROTAS PÚBLICAS (sem autenticação) ---
// ============================================================
app.post('/api/login/google', googleLogin);
app.post('/api/auth/send-mfa', sendMfa);
app.post('/api/auth/verify-mfa', verifyMfa);
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// ============================================================
// --- AUTENTICAÇÃO GLOBAL /api (exceto rotas públicas acima) ---
// ============================================================
// Valida x-user-id + sessão; anexa req.authUser (id, systemProfile). Não confiar em x-user-id sem sessão válida.
app.use('/api', requireAuth);

// Rate limits que dependem da identidade autenticada: DEVEM vir depois de requireAuth (chave = req.authUser.id, não o header).
const rootAccessRevokeUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Limite de revogações por hora atingido.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.authUser?.id;
    return uid ? `revoke-root:${uid}` : ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1');
  }
});

const rootAccessExportUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitos exports. Aguarde um minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = req.authUser?.id;
    return uid ? `export-root:${uid}` : ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '127.0.0.1');
  }
});

// ============================================================
// --- ROTAS ADMINISTRATIVAS ---
// ============================================================
app.get('/api/admin/reset-tools', resetCatalog);
app.get('/api/admin/login-attempts', getLoginAttempts);
app.get('/api/admin/sessions', getSessions);
app.delete('/api/admin/sessions/:userId', revokeSession);
app.delete('/api/admin/sessions', revokeAllSessions);
app.post('/api/admin/jobs/validate-aex-sync', postValidateAexSync);

// ============================================================
// --- ROTAS DE DADOS ---
// ============================================================

// 1. Estrutura (rotas de units antes de departments para não capturar :id em "units")
app.get('/api/departments', structureController.listDepartments);
app.get('/api/roles', structureController.listRolesByDepartment);
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
app.get('/api/tools-and-levels', async (_req: Request, res: Response) => {
  try {
    res.json(await buildToolsAndLevelsMap(prisma));
  } catch (e) {
    console.error('Erro em /api/tools-and-levels:', e);
    res.status(500).json({ error: 'Erro ao montar ferramentas e níveis.' });
  }
});

app.get('/api/kbu', getKbu);
app.put('/api/kbu/:id', putKbu);
app.post('/api/kbu', postKbu);
app.delete('/api/kbu/:id', deleteKbu);
app.post('/api/tools', createTool);
app.put('/api/tools/:id', updateTool); // Atualizar ferramenta (Grupo, Owner, Níveis)
app.delete('/api/tools/:id', deleteTool); // EXCLUIR FERRAMENTA

app.get('/api/tool-groups', getToolGroups);
app.post('/api/tool-groups', createToolGroup);
app.delete('/api/tool-groups/:id', deleteToolGroup);

app.post('/api/tools/:id/access', addToolAccess);     // Adicionar/Atualizar acesso de usuário
app.delete('/api/tools/:id/access/:userId', removeToolAccess); // Remover acesso
app.post('/api/tools/:toolId/levels', createToolAccessLevel);
app.put('/api/tools/:toolId/levels/:levelId', updateToolAccessLevel);
app.delete('/api/tools/:toolId/levels/:levelId', deleteToolAccessLevel);
app.patch('/api/tools/:toolId/level/:oldLevelName', updateToolLevel);
app.delete('/api/tools/:toolId/level/:levelName', deleteToolLevel);
app.patch('/api/tools/:toolId/access/:userId', updateToolAccess); // Atualizar detalhes do acesso (ex: extra)

// 3. Usuários (rotas específicas antes de /:id)
app.get('/api/users/search', searchUsersForAutocomplete);
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
app.get('/api/requests/export', rootAccessExportUserLimiter, getRootAccessExportCsv);
app.post('/api/requests/:id/revoke', rootAccessRevokeUserLimiter, postRevokeRootAccessRequest);
app.post('/api/requests/:id/confirm-jc-suspension', confirmJcSuspension);
app.get('/api/solicitacoes', getSolicitacoes);
app.get('/api/root-access', getRootAccessReport);
app.get('/api/root-access/:id', getRootAccessDetail);
app.get('/api/solicitacoes/my-tickets', getMyTickets);
app.get('/api/solicitacoes/:id', getSolicitacaoById);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id/metadata', updateSolicitacaoMetadata);
app.patch('/api/solicitacoes/:id/assignee', patchRequestAssignee);
app.patch('/api/solicitacoes/:id/inbox', patchRequestInbox);
app.post('/api/solicitacoes/:id/comments', createComment);
app.post('/api/solicitacoes/:id/attachments', createAttachment);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// --- SGSI INTEGRATION ---
app.get('/api/sgsi-integration/users', requireServiceToken, getUsers);
app.get('/api/sgsi-integration/users/by-email/:email', requireServiceToken, getUserByEmail);
app.get('/api/sgsi-integration/users/si-members', requireServiceToken, getSiMembers);
app.get('/api/sgsi-integration/users/board', requireServiceToken, getBoardMembers);
app.post('/api/sgsi-integration/auth/verify', requireServiceToken, verifyToken);

// ============================================================
// --- SERVIR FRONTEND ---
// ============================================================
const frontendPath = path.join(__dirname, 'client');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
  console.log('[Config] SLACK_SI_CHANNEL_ID:', process.env.SLACK_SI_CHANNEL_ID ?? 'NÃO DEFINIDO');
  console.log('[Config] SLACK_ID_LUAN:', process.env.SLACK_ID_LUAN ?? 'NÃO DEFINIDO');
  console.log('[Config] SLACK_ID_VLADIMIR:', process.env.SLACK_ID_VLADIMIR ?? 'NÃO DEFINIDO');
  console.log('[Config] SLACK_ID_ALLAN:', process.env.SLACK_ID_ALLAN ?? 'NÃO DEFINIDO');
  console.log('[Config] FRONTEND_URL:', process.env.FRONTEND_URL ?? 'NÃO DEFINIDO');
  console.log('[Config] SLACK_GRUPO_SEGURANCA_CHANNEL_ID:', process.env.SLACK_GRUPO_SEGURANCA_CHANNEL_ID ?? 'NÃO DEFINIDO');
});