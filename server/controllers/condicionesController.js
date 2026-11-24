import Cliente from '../models/Cliente.js';
import CondicionComercial from '../models/CondicionComercial.js';

// GET /users/:id/condiciones -> historial completo, del mas nuevo al mas viejo
export const listarCondiciones = async (req, res, next) => {
  try {
    const existe = await Cliente.exists({ _id: req.params.id });
    if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });

    const condiciones = await CondicionComercial
      .find({ cliente: req.params.id })
      .sort({ vigenteDesde: -1, createdAt: -1 });
    res.json(condiciones);
  } catch (error) { next(error); }
};

// POST /users/:id/condiciones -> registra una condicion nueva.
// Quien autoriza sale del header X-Usuario, no del body, para que no se pueda
// cargar una condicion "a nombre de otro" desde el formulario.
export const crearCondicion = async (req, res, next) => {
  try {
    const autorizadoPor = req.get('X-Usuario')?.trim();
    if (!autorizadoPor) {
      return res.status(400).json({ error: 'Falta el header X-Usuario que identifica a quien autoriza' });
    }

    const existe = await Cliente.exists({ _id: req.params.id });
    if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { descuento, limiteCredito, motivo, vigenteDesde } = req.body;
    const condicion = await CondicionComercial.create({
      cliente: req.params.id,
      descuento,
      limiteCredito,
      motivo,
      vigenteDesde,
      autorizadoPor
    });
    res.status(201).json(condicion);
  } catch (error) { next(error); }
};
