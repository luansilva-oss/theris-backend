import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importando as rotas
import colaboradoresRoutes from './routes/colaboradores';
import solicitacoesRoutes from './routes/solicitacoes';

// Carrega as variáveis de ambiente (.env)
dotenv.config();

// Inicializa o app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (Configurações globais)
app.use(cors());              // Permite acesso externo (frontend)
app.use(express.json());      // Permite ler JSON no corpo das requisições

// --- ROTAS ---

// 1. Rota de Saúde (Health Check) - Para testar se o servidor está vivo
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    server: 'Theris Backend v1.0',
    timestamp: new Date()
  });
});

// 2. Rotas da API
app.use('/api/colaboradores', colaboradoresRoutes); // GET /api/colaboradores
app.use('/api/solicitacoes', solicitacoesRoutes);   // POST e GET /api/solicitacoes

// --- INICIALIZAÇÃO ---

app.listen(PORT, () => {
  console.log(`🚀 Servidor Theris rodando a todo vapor em http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   - GET  /api/colaboradores`);
  console.log(`   - GET  /api/solicitacoes`);
  console.log(`   - POST /api/solicitacoes`);
});