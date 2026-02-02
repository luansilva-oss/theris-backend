import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path'; // Importante para gerenciar os caminhos das pastas

// Controladores
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { googleLogin } from './controllers/authController';

// Slack
import { slackReceiver } from './services/slackService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CORS ---
// Permite conexões de qualquer origem (útil para dev/prod)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// ⚠️ ROTA DO SLACK (Deve vir ANTES do express.json para processar webhooks corretamente)
app.use('/api/slack', slackReceiver.router);

// --- JSON MIDDLEWARE ---
app.use(express.json());

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/login/google', googleLogin);

// --- ROTAS DE DADOS (API) ---

// 1. Estrutura Organizacional (Departamentos e Cargos)
app.get('/api/structure', async (req, res) => {
  try {
    const data = await prisma.department.findMany({
      include: {
        roles: {
          include: { users: true }
        }
      }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estrutura.' });
  }
});

// 2. Ferramentas (COM GOVERNANÇA: Owners, Sub-Owners e Usuários)
app.get('/api/tools', async (req, res) => {
  try {
    const tools = await prisma.tool.findMany({
      include: {
        // Quem aprova?
        owner: { select: { name: true, email: true } },
        subOwner: { select: { name: true, email: true } },
        // Quem tem acesso ativo?
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

// 3. Usuários (Com detalhes de hierarquia e deputy)
app.get('/api/users', async (req, res) => {
  try {
    const data = await prisma.user.findMany({
      include: {
        role: true,
        department: true,
        myDeputy: true
      }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// --- ROTAS DE SOLICITAÇÕES (WORKFLOW) ---
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// --- SERVIR FRONTEND (VITE) ---
// Configuração para produção no Render:
// O Backend compilado está em '/dist-server/index.js'
// O Frontend compilado está em '/dist/index.html'
// Portanto, voltamos um nível (..) e entramos em 'dist'
const frontendPath = path.resolve(__dirname, '../dist');

// Serve os arquivos estáticos (JS, CSS, Imagens)
app.use(express.static(frontendPath));

// Redireciona qualquer rota desconhecida para o React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Theris Backend rodando na porta ${PORT}`);
  console.log(`📂 Servindo frontend de: ${frontendPath}`);
});