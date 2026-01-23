import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { criarSolicitacao, listarSolicitacoes, atualizarStatus } from './controllers/solicitacaoController';

const app = express();
const prisma = new PrismaClient();

// --- CONFIGURAÇÃO DE CORS ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- FUNÇÃO SEGURA PARA LER O TOKEN (Versão Node.js) ---
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
// ROTA DE LOGIN
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

    // --- CORREÇÃO AQUI (Adicionado ?. e || "") ---
    // Verifica se o departamento existe antes de ler o nome
    const deptName = user.department?.name || "";
    const roleName = user.role?.name || "";

    if (['Tecnologia e Segurança', 'Board'].includes(deptName)) {
      profile = 'ADMIN';
    } else if (['Líder', 'Head', 'Gerente', 'Coordenador', 'Gestor', 'CEO'].some(k => roleName.includes(k))) {
      profile = 'APPROVER';
    }

    return res.json({ user, profile });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ==========================================
// ROTAS DE DADOS
// ==========================================
app.get('/api/structure', async (req, res) => {
  const structure = await prisma.department.findMany({ include: { roles: { include: { users: true } } } });
  res.json(structure);
});

app.get('/api/tools', async (req, res) => {
  const tools = await prisma.tool.findMany({ include: { owner: true } });
  res.json(tools);
});

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany({ include: { role: true, department: true } });
  res.json(users);
});

// ==========================================
// ROTAS DE SOLICITAÇÕES
// ==========================================
app.get('/api/solicitacoes', listarSolicitacoes);
app.post('/api/solicitacoes', criarSolicitacao);
app.patch('/api/solicitacoes/:id', atualizarStatus);

// ==========================================
// START SERVER
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});