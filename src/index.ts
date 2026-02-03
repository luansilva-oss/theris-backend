import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// --- IMPORTAÇÕES DOS CONTROLADORES ---
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin, sendMfa, verifyMfa } from './controllers/authController';
import { getAllTools } from './controllers/toolController';
import { getAllUsers } from './controllers/userController';

// Slack
import { slackReceiver } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

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
// --- ROTAS DE DADOS ---
// ============================================================

// 1. Estrutura (CORRIGIDO: Removemos o include users que dava erro)
app.get('/api/structure', async (req, res) => {
  try {
    const data = await prisma.department.findMany({
      include: {
        roles: true // <--- MUDANÇA AQUI: Removemos { include: { users: true } }
      }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estrutura.' });
  }
});

// 2. Ferramentas
app.get('/api/tools', getAllTools);

// 3. Usuários (Usa o controller novo que criamos)
app.get('/api/users', getAllUsers);

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