import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Controladores
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin } from './controllers/authController';

// Slack
import { slackReceiver } from './services/slackService'; 

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CORS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK (CRÍTICO: TEM QUE SER A PRIMEIRA ROTA)
// O Slack envia dados brutos (raw body) que o receiver precisa validar.
// Se passar pelo express.json() abaixo, o Slack para de funcionar.
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE (Para o Frontend/React) ---
app.use(express.json());

// --- ROTAS DO SISTEMA ---

// Login
app.post('/api/login/google', googleLogin);

// Dados Auxiliares
app.get('/api/structure', async (req, res) => {
  const data = await prisma.department.findMany({ include: { roles: { include: { users: true } } } });
  res.json(data);
});

app.get('/api/tools', async (req, res) => {
  const data = await prisma.tool.findMany({ include: { owner: true } });
  res.json(data);
});

app.get('/api/users', async (req, res) => {
  const data = await prisma.user.findMany({ include: { role: true, department: true } });
  res.json(data);
});

// Solicitações
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// --- START ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
});