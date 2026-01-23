import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { criarSolicitacao, listarSolicitacoes, atualizarStatus } from './controllers/solicitacaoController';

const app = express();
const prisma = new PrismaClient();

// --- CONFIGURAÇÃO DE CORS (CRÍTICO PARA O LOGIN) ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Aceita as duas portas
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- FUNÇÃO AUXILIAR PARA LER O TOKEN DO GOOGLE ---
// (Decodifica o JWT sem precisar de bibliotecas extras pesadas)
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO (LOGIN)
// ==========================================
app.post('/api/login/google', async (req: Request, res: Response): Promise<any> => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Credencial não fornecida' });
  }

  // 1. Decodifica o token para pegar o email
  const payload = decodeJwt(credential);
  
  if (!payload || !payload.email) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  const googleEmail = payload.email;

  // 2. Busca o usuário no banco pelo email
  try {
    const user = await prisma.user.findUnique({
      where: { email: googleEmail },
      include: { 
        role: true, 
        department: true,
        manager: true 
      }
    });

    if (!user) {
      // Usuário não cadastrado no Seed/Banco
      return res.status(403).json({ error: 'Usuário não encontrado no sistema. Contate o Admin.' });
    }

    // 3. Define o Perfil de Acesso (Simulação de RBAC)
    let profile = 'VIEWER';
    
    // Regra: Quem é do Depto "Tecnologia e Segurança" ou "Board" vira ADMIN
    if (user.department.name === 'Tecnologia e Segurança' || user.department.name === 'Board') {
      profile = 'ADMIN';
    } 
    // Regra: Quem tem cargo de liderança vira APPROVER
    else if (['Líder', 'Head', 'Gerente', 'Coordenador', 'Gestor', 'CEO', 'CTO', 'CPO', 'CMO'].some(k => user.role.name.includes(k))) {
      profile = 'APPROVER'; // Ou ADMIN se preferir
    }

    return res.json({ user, profile });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ==========================================
// ROTAS DE DADOS (GET)
// ==========================================

// 1. Organograma (Estrutura)
app.get('/api/structure', async (req, res) => {
  const structure = await prisma.department.findMany({
    include: {
      roles: {
        include: { users: true }
      }
    }
  });
  res.json(structure);
});

// 2. Ferramentas
app.get('/api/tools', async (req, res) => {
  const tools = await prisma.tool.findMany({
    include: { owner: true }
  });
  res.json(tools);
});

// 3. Usuários (Para o dropdown de beneficiários)
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true, department: true }
  });
  res.json(users);
});

// ==========================================
// ROTAS DE SOLICITAÇÕES (REQUESTS)
// ==========================================
app.get('/api/solicitacoes', listarSolicitacoes);
app.post('/api/solicitacoes', criarSolicitacao);
app.patch('/api/solicitacoes/:id', atualizarStatus);

// ==========================================
// INICIALIZAÇÃO
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔓 CORS Habilitado para: http://localhost:5173 e http://localhost:5174`);
});