import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path'; // <--- Importante para achar os arquivos do site

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

// ⚠️ ROTA DO SLACK (Deve vir ANTES do express.json)
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE ---
app.use(express.json());

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/login/google', googleLogin);

// --- ROTAS DE DADOS ---

// 1. Estrutura (Departamentos)
app.get('/api/structure', async (req, res) => {
  const data = await prisma.department.findMany({ include: { roles: { include: { users: true } } } });
  res.json(data);
});

// 2. Ferramentas (ATUALIZADO PARA GOVERNANÇA)
app.get('/api/tools', async (req, res) => {
  try {
    const tools = await prisma.tool.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        subOwner: { select: { name: true, email: true } },
        accesses: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(tools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar catálogo de ferramentas.' });
  }
});

// 3. Usuários
app.get('/api/users', async (req, res) => {
  const data = await prisma.user.findMany({ include: { role: true, department: true, myDeputy: true } });
  res.json(data);
});

// --- ROTAS DE SOLICITAÇÕES ---
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// --- SERVIR FRONTEND (VITE) ---
// Isso diz ao Express: "Pegue os arquivos da pasta 'dist' (que o vite build criou) e mostre no navegador"
app.use(express.static(path.join(__dirname, '../dist')));

// Qualquer rota que não seja API, manda para o React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
});