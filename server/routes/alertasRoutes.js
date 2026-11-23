import { Router } from 'express';
import Cliente from '../models/Cliente.js';
import {
  ESTADOS,
  calcularDiasSinCompra,
  calcularRiesgo,
  obtenerUmbrales
} from '../services/alertasService.js';

const router = Router();

// Tipos de alerta disponibles. "documentos" se suma con el control documental.
const TIPOS = ['inactividad'];

const nombreCompleto = ({ name } = {}) =>
  [name?.firstname, name?.lastname]
    .filter((parte) => parte && parte !== '-')
    .join(' ');

// GET /alertas?tipo=inactividad
// Devuelve los clientes en_riesgo e inactivo, los de mas dias sin compra
// primero (los que no tienen ninguna fecha van arriba de todo).
router.get('/', async (req, res, next) => {
  try {
    const tipo = req.query.tipo ?? 'inactividad';
    if (!TIPOS.includes(tipo)) {
      return res.status(400).json({ error: `Tipo de alerta invalido. Valores posibles: ${TIPOS.join(', ')}` });
    }

    const clientes = await Cliente
      .find({}, 'name sucursal ultimaCompra createdAt')
      .lean();

    const hoy = new Date();
    const umbrales = obtenerUmbrales();

    const alertas = clientes
      .map((cliente) => ({
        id: String(cliente._id),
        nombre: nombreCompleto(cliente),
        sucursal: cliente.sucursal ?? 'Casa Central',
        diasSinCompra: calcularDiasSinCompra(cliente, hoy),
        estado: calcularRiesgo(cliente, hoy, umbrales)
      }))
      .filter((alerta) => alerta.estado !== ESTADOS.ACTIVO)
      .sort((a, b) => (b.diasSinCompra ?? Infinity) - (a.diasSinCompra ?? Infinity));

    res.json(alertas);
  } catch (error) { next(error); }
});

export default router;
