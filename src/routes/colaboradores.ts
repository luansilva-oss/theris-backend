import { Router } from 'express';
import { listarColaboradores } from '../controllers/colaboradorController';

const router = Router();

// Quando acessarem GET /api/colaboradores, chama a função listarColaboradores
router.get('/', listarColaboradores);

export default router;