import { Router } from 'express';
import {
listarClientes,
resumenSucursales,
obtenerCliente,
crearCliente,
actualizarCliente,
eliminarCliente,
agregarDocumento,
eliminarDocumento
} from '../controllers/clientesController.js';
import { listarCondiciones, crearCondicion } from '../controllers/condicionesController.js';
import { listarVisitas, registrarVisita } from '../controllers/visitasController.js';
import { validarCliente, validarClienteParcial } from '../middleware/validarCliente.js';
import { validarDocumento } from '../middleware/validarDocumento.js';
const router = Router();
router.get('/', listarClientes);
// Va antes de /:id para que "resumen" nunca se interprete como un id.
router.get('/resumen/sucursales', resumenSucursales);
router.get('/:id', obtenerCliente);
router.post('/', validarCliente, crearCliente);
router.put('/:id', validarClienteParcial, actualizarCliente);
router.delete('/:id', eliminarCliente);
router.post('/:id/documentos', validarDocumento, agregarDocumento);
router.delete('/:id/documentos/:docId', eliminarDocumento);
// Condiciones comerciales: append-only, por eso no hay PUT ni DELETE.
router.get('/:id/condiciones', listarCondiciones);
router.post('/:id/condiciones', crearCondicion);
router.get('/:id/visitas', listarVisitas);
router.post('/:id/visitas', registrarVisita);
export default router;
