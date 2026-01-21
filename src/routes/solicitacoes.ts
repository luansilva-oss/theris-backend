import { Router } from 'express';
// Adicione o 'atualizarStatus' no import
import { criarSolicitacao, listarSolicitacoes, atualizarStatus } from '../controllers/solicitacaoController';

const router = Router();

router.post('/', criarSolicitacao);
router.get('/', listarSolicitacoes);

// NOVA ROTA: O ":id" indica que essa parte da URL é variável
router.patch('/:id/status', atualizarStatus);

export default router;