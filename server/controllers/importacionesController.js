import { importarClientes } from '../services/importarClientes.js';

// POST /importaciones/clientes[?simulacion=true]
// multipart/form-data con el CSV exportado del ERP en el campo "archivo".
export const importarClientesCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo CSV (campo "archivo")' });
    }
    const simulacion = req.query.simulacion === 'true';
    const resultado = await importarClientes(req.file.buffer, { simulacion });
    res.json(resultado);
  } catch (error) { next(error); }
};
