import { Router } from 'express';
import { exportarClientes } from '../controllers/exportacionesController.js';

const router = Router();

router.get('/clientes', exportarClientes);

export default router;
