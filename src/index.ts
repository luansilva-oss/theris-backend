import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// --- IMPORTAÇÕES DOS CONTROLADORES ---
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin } from './controllers/authController';
import { getAllTools } from './controllers/toolController'; // <--- O NOVO CONTROLADOR

// Slack
import { slackReceiver } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CORS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK (Deve vir antes do express.json para o receptor funcionar)
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE ---
app.use(express.json());

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/login/google', googleLogin);

// --- ROTAS DE DADOS ---

// 1. Estrutura
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

// 2. Ferramentas (CORREÇÃO AQUI 👇)
// Usamos apenas o controlador importado. Ele já resolve tudo.
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

// --- WORKFLOW ---
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// --- SERVIR FRONTEND ---
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