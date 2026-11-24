import { Router } from 'express';
import { listarAlertas } from '../controllers/alertasController.js';

const router = Router();

router.get('/', listarAlertas);

export default router;
