import { Router } from 'express';
import * as SolicitacaoController from './controllers/solicitacaoController';
import * as ReferenceController from './controllers/referenceController';
import * as AuthController from './controllers/authController'; // <--- O novo Controller

const router = Router();

// --- 🔐 AUTENTICAÇÃO (SSO Google) ---
router.post('/login/google', AuthController.loginGoogle);

// --- 📝 ROTAS DE SOLICITAÇÃO (Core IGA) ---
router.post('/solicitacoes', SolicitacaoController.criarSolicitacao);
router.get('/solicitacoes', SolicitacaoController.listarSolicitacoes);
router.patch('/solicitacoes/:id', SolicitacaoController.atualizarStatus);

// --- 🏢 ROTAS ENTERPRISE (Dados de Referência) ---
router.get('/structure', ReferenceController.getOrganizationStructure);
router.get('/tools', ReferenceController.getTools);
router.get('/users', ReferenceController.getUsers);

export default router;