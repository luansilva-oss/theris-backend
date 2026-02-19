import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// --- IMPORTAÇÕES DOS CONTROLADORES ---
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin, sendMfa, verifyMfa } from './controllers/authController';
import { getTools, createTool, updateTool, deleteTool, getToolGroups, createToolGroup, deleteToolGroup, addToolAccess, removeToolAccess, updateToolAccess, updateToolLevel } from './controllers/toolController';
import { getAllUsers, updateUser, deleteUser } from './controllers/userController';
// NOVO: Importar o controlador de reset
import { resetCatalog } from './controllers/adminController';
import * as structureController from './controllers/structureController';
import { syncStructureFromUsers } from './services/structureSync'; // Import sync service

// Slack
import { slackReceiver } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Auto-sync structure on startup
syncStructureFromUsers();

// --- CORS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE ---
app.use(express.json());

// ============================================================
// --- ROTAS DE AUTENTICAÇÃO ---
// ============================================================
app.post('/api/login/google', googleLogin);
app.post('/api/auth/send-mfa', sendMfa);
app.post('/api/auth/verify-mfa', verifyMfa);

// ============================================================
// --- ROTAS ADMINISTRATIVAS (EMERGÊNCIA) ---
// ============================================================
// Roda este link no navegador para resetar o catálogo de ferramentas
app.get('/api/admin/reset-tools', resetCatalog);

// ============================================================
// --- ROTAS DE DADOS ---
// ============================================================

// 1. Estrutura
app.get('/api/structure', structureController.getStructure);
app.post('/api/structure/departments', structureController.createDepartment);
app.put('/api/structure/departments/:id', structureController.updateDepartment);
app.delete('/api/structure/departments/:id', structureController.deleteDepartment);

app.post('/api/structure/roles', structureController.createRole);
app.put('/api/structure/roles/:id', structureController.updateRole);
app.delete('/api/structure/roles/:id', structureController.deleteRole);

// 2. Ferramentas
app.get('/api/tools', getTools);
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

// 3. Usuários
app.get('/api/users', getAllUsers);
app.put('/api/users/:id', updateUser);
app.delete('/api/users/:id', deleteUser);

// ============================================================
// --- INTEGRAÇÃO CONVENIA ---
// ============================================================
import { handleConveniaWebhook } from './controllers/conveniaController';
app.post('/api/webhooks/convenia', handleConveniaWebhook);

// ============================================================
// --- WORKFLOW (SOLICITAÇÕES) ---
// ============================================================
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
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