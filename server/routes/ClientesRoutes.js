import { Router } from 'express';
import {
listarClientes,
obtenerCliente,
crearCliente,
eliminarCliente
} from '../controllers/clientesController.js';
import { validarCliente } from '../middleware/validarCliente.js';
const router = Router();
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);
router.post('/', validarCliente, crearCliente);
router.delete('/:id', eliminarCliente);
export default router;