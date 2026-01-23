import { Router } from 'express';
import * as SolicitacaoController from './controllers/solicitacaoController';
import * as ReferenceController from './controllers/referenceController';

const router = Router();

// --- ROTAS DE SOLICITAÇÃO (IGA Core) ---
router.post('/solicitacoes', SolicitacaoController.criarSolicitacao);
router.get('/solicitacoes', SolicitacaoController.listarSolicitacoes);
router.patch('/solicitacoes/:id', SolicitacaoController.atualizarStatus);

// --- ROTAS ENTERPRISE (Organograma e Ferramentas) ---
router.get('/structure', ReferenceController.getOrganizationStructure);
router.get('/tools', ReferenceController.getTools);
router.get('/users', ReferenceController.getUsers);

export default router;