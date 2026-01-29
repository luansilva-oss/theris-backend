import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Importa Controladores
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin } from './controllers/authController';

// Importa o Receiver do Slack
import { slackReceiver } from './services/slackService'; 

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CORS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK (Deve vir ANTES do express.json)
// O Slack envia dados brutos que o receiver precisa validar
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE (Para o Frontend React) ---
app.use(express.json());

// --- ROTAS DO FRONTEND ---

// Login (Novo método)
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

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`📡 URL para o Slack: https://seu-app.onrender.com/api/slack/events`);
});