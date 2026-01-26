import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
// CORREÇÃO: Atualizei os nomes aqui para bater com o Controller novo
import { createSolicitacao, getSolicitacoes, updateSolicitacao } from './controllers/solicitacaoController';
import { startSlackBot } from './services/slackService'; 
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// --- CONFIGURAÇÃO DE CORS ---
app.use(cors({
  // Permite localhost E a sua futura URL na Vercel (se quiser liberar geral coloque origin: '*')
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- FUNÇÃO SEGURA PARA LER O TOKEN ---
function decodeJwt(token: string) {
  try {
    const base64Payload = token.split('.')[1];
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (e) {
    console.error("Erro ao decodificar token:", e);
    return null;
  }
}

// ==========================================
// ROTA DE LOGIN (MANTIDA IGUAL)
// ==========================================
app.post('/api/login/google', async (req: Request, res: Response): Promise<any> => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Credencial não fornecida' });
  }

  const payload = decodeJwt(credential);
  
  if (!payload || !payload.email) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  const googleEmail = payload.email;
  console.log(`Tentativa de login: ${googleEmail}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: googleEmail },
      include: { role: true, department: true, manager: true }
    });

    if (!user) {
      console.log('Usuário não encontrado no banco.');
      return res.status(403).json({ error: 'Usuário não encontrado. Contate o Admin.' });
    }

    let profile = 'VIEWER';
    const deptName = user.department?.name || "";
    const roleName = user.role?.name || "";

    if (user.name === 'Vladimir Antonio Sesar') {
      profile = 'SUPER_ADMIN';
    } 
    else if (['Tecnologia e Segurança', 'Board'].includes(deptName)) {
      profile = 'ADMIN';
    } 
    else if (['Líder', 'Head', 'Gerente', 'Coordenador', 'Gestor', 'CEO'].some(k => roleName.includes(k))) {
      profile = 'APPROVER';
    }

    return res.json({ user, profile });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ==========================================
// ROTAS DE DADOS (GET)
// ==========================================
app.get('/api/structure', async (req, res) => {
  const structure = await prisma.department.findMany({ include: { roles: { include: { users: true } } } });
  res.json(structure);
});

// CORREÇÃO: AccessLevels removido pois não existe mais no schema, mantendo simples
app.get('/api/tools', async (req, res) => {
  const tools = await prisma.tool.findMany({ include: { owner: true } });
  res.json(tools);
});

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany({ include: { role: true, department: true } });
  res.json(users);
});

// ==========================================
// ROTAS DE SOLICITAÇÕES (CORRIGIDAS)
// ==========================================
// Usando os novos nomes importados do controller
app.get('/api/solicitacoes', getSolicitacoes);
app.post('/api/solicitacoes', createSolicitacao);
app.patch('/api/solicitacoes/:id', updateSolicitacao);

// ==========================================
// START SERVER & SLACK BOT
// ==========================================
// CORREÇÃO: Render exige process.env.PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  
  try {
    // Só inicia o Slack se tiver token, para não quebrar build se faltar env var
    if (process.env.SLACK_BOT_TOKEN) {
        await startSlackBot();
        console.log("💬 Integração com Slack iniciada.");
    } else {
        console.log("⚠️ Slack Token não encontrado, bot pulado.");
    }
  } catch (e) {
    console.error("⚠️ Erro no Slack Bot:", e);
  }
});