import { Router } from 'express';
import {
listarClientes,
resumenSucursales,
obtenerCliente,
crearCliente,
actualizarCliente,
eliminarCliente
} from '../controllers/clientesController.js';
import { validarCliente, validarClienteParcial } from '../middleware/validarCliente.js';
const router = Router();
router.get('/', listarClientes);
// Va antes de /:id para que "resumen" nunca se interprete como un id.
router.get('/resumen/sucursales', resumenSucursales);
router.get('/:id', obtenerCliente);
router.post('/', validarCliente, crearCliente);
router.put('/:id', validarClienteParcial, actualizarCliente);
router.delete('/:id', eliminarCliente);
export default router;
