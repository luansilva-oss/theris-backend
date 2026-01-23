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
// ROTA DE LOGIN (ATUALIZADA COM SUPER_ADMIN)
// ==========================================
app.post('/api/login/google', async (req: Request, res: Response): Promise<any> => {
  const { credential } = req.body;

  if (!credential) return res.status(400).json({ error: 'Credencial não fornecida' });

  const payload = decodeJwt(credential);
  if (!payload || !payload.email) return res.status(400).json({ error: 'Token inválido' });

  const googleEmail = payload.email;
  console.log(`Tentativa de login: ${googleEmail}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: googleEmail },
      include: { role: true, department: true, manager: true }
    });

    if (!user) return res.status(403).json({ error: 'Usuário não encontrado. Contate o Admin.' });

    // --- DEFINIÇÃO DE PERFIS (RBAC) ---
    let profile = 'VIEWER';
    const deptName = user.department?.name || "";
    const roleName = user.role?.name || "";

    // 1. Nível 4: SUPER_ADMIN (Vladimir Sesar)
    if (user.name === 'Vladimir Antonio Sesar') {
      profile = 'SUPER_ADMIN';
    } 
    // 2. Nível 3: ADMIN (SI e Board)
    else if (['Tecnologia e Segurança', 'Board'].includes(deptName)) {
      profile = 'ADMIN';
    } 
    // 3. Nível 2: APPROVER (Gestores)
    else if (['Líder', 'Head', 'Gerente', 'Coordenador', 'Gestor', 'CEO'].some(k => roleName.includes(k))) {
      profile = 'APPROVER';
    }
    // 4. Nível 1: VIEWER (Padrão)

    return res.json({ user, profile });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ==========================================
// ROTAS DE DADOS E SOLICITAÇÕES
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

app.get('/api/solicitacoes', listarSolicitacoes);
app.post('/api/solicitacoes', criarSolicitacao);
app.patch('/api/solicitacoes/:id', atualizarStatus);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});