import { Router } from 'express';
import { vendedoresActivos } from '../controllers/metricasController.js';

const router = Router();

router.get('/vendedores-activos', vendedoresActivos);

export default router;
