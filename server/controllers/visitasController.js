import mongoose from 'mongoose';
import Cliente from '../models/Cliente.js';
import Visita from '../models/Visita.js';

const LIMITE_HISTORIAL = 20;

// GET /users/:id/visitas -> las ultimas 20 visitas, de la mas reciente a la mas vieja
export const listarVisitas = async (req, res, next) => {
  try {
    const existe = await Cliente.exists({ _id: req.params.id });
    if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });

    const visitas = await Visita
      .find({ cliente: req.params.id })
      .sort({ fecha: -1, createdAt: -1 })
      .limit(LIMITE_HISTORIAL);
    res.json(visitas);
  } catch (error) { next(error); }
};

// POST /users/:id/visitas -> registra la visita y actualiza cliente.ultimaVisita
// (y ultimaCompra si hubo pedido) dentro de una misma transaccion: o se
// guardan las dos cosas o ninguna.
// El vendedor sale del header X-Usuario, igual que en condiciones comerciales.
export const registrarVisita = async (req, res, next) => {
  try {
    const vendedor = req.get('X-Usuario')?.trim();
    if (!vendedor) {
      return res.status(400).json({ error: 'Falta el header X-Usuario que identifica al vendedor' });
    }

    const { resultado, nota, fecha } = req.body;
    const visita = new Visita({ cliente: req.params.id, vendedor, resultado, nota, fecha });
    // Se valida antes de abrir la transaccion (enum, nota <= 280, etc.).
    await visita.validate();

    // $max: una visita cargada con fecha anterior no "atrasa" la ultima visita.
    const actualizacion = { $max: { ultimaVisita: visita.fecha } };
    if (visita.resultado === 'pedido') actualizacion.$max.ultimaCompra = visita.fecha;

    let clienteActualizado;
    await mongoose.connection.transaction(async (session) => {
      clienteActualizado = await Cliente.findByIdAndUpdate(
        req.params.id,
        actualizacion,
        { new: true, session }
      );
      if (!clienteActualizado) {
        const error = new Error('Cliente no encontrado');
        error.status = 404;
        throw error; // aborta la transaccion
      }
      await visita.save({ session });
    });

    res.status(201).json({ visita, cliente: clienteActualizado });
  } catch (error) { next(error); }
};
