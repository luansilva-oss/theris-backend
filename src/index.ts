import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// --- IMPORTAÇÕES DOS CONTROLADORES ---
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
// ATUALIZADO: Importamos sendMfa e verifyMfa aqui 👇
import { googleLogin, sendMfa, verifyMfa } from './controllers/authController';
import { getAllTools } from './controllers/toolController';

// Slack
import { slackReceiver } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CORS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK (IMPORTANTE: Deve vir ANTES do express.json)
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE (Necessário para ler o body das requisições abaixo) ---
app.use(express.json());

// ============================================================
// --- ROTAS DE AUTENTICAÇÃO E MFA (AQUI!) ---
// ============================================================
app.post('/api/login/google', googleLogin);
app.post('/api/auth/send-mfa', sendMfa);     // <--- Nova rota
app.post('/api/auth/verify-mfa', verifyMfa); // <--- Nova rota

// ============================================================
// --- ROTAS DE DADOS ---
// ============================================================

// 1. Estrutura (Departamentos)
app.get('/api/structure', async (req, res) => {
  try {
    const data = await prisma.department.findMany({
      include: { roles: { include: { users: true } } }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estrutura.' });
  }
});

// 2. Ferramentas
app.get('/api/tools', getAllTools);

// 3. Usuários
app.get('/api/users', async (req, res) => {
  try {
    const data = await prisma.user.findMany({
      include: { role: true, department: true, myDeputy: true }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// ============================================================
// --- WORKFLOW (SOLICITAÇÕES) ---
// ============================================================
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// ============================================================
// --- SERVIR FRONTEND (PRODUÇÃO) ---
// ============================================================
const frontendPath = path.resolve(__dirname, '../dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
});