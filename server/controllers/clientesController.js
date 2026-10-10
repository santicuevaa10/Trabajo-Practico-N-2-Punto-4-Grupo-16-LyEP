import Cliente from '../models/Cliente.js';
export const listarClientes = async (req, res, next) => {
try {
const clientes = await Cliente.find();
res.json(clientes);
} catch (error) { next(error); }
};
export const obtenerCliente = async (req, res, next) => {
try {
const cliente = await Cliente.findById(req.params.id);
if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
res.json(cliente);
} catch (error) { next(error); }
};
export const crearCliente = async (req, res, next) => {
try {
const nuevoCliente = await Cliente.create(req.body);
res.status(201).json(nuevoCliente);
} catch (error) { next(error); }
};
export const eliminarCliente = async (req, res, next) => {
try {
const eliminado = await Cliente.findByIdAndDelete(req.params.id);
if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
res.status(204).send();
} catch (error) { next(error); }
};
