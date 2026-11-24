import { Router } from 'express';
import { vendedoresActivos, resumenMetricas } from '../controllers/metricasController.js';

const router = Router();

router.get('/vendedores-activos', vendedoresActivos);
router.get('/resumen', resumenMetricas);

export default router;
