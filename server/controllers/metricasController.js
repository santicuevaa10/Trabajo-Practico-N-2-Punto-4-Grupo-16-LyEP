import Visita from '../models/Visita.js';
import { rangoDeSemanaIso, semanaIsoDeFecha } from '../utils/semanaIso.js';

// GET /metricas/vendedores-activos?semana=AAAA-Www
// Cantidad de vendedores distintos con al menos 1 visita en la semana ISO
// indicada (por defecto, la semana actual). Metrica del bloque 8.
export const vendedoresActivos = async (req, res, next) => {
  try {
    const semana = req.query.semana ?? semanaIsoDeFecha(new Date()).texto;
    const rango = rangoDeSemanaIso(semana);
    if (!rango) {
      return res.status(400).json({ error: 'Parametro "semana" invalido. Formato esperado: AAAA-Www (ej. 2026-W48)' });
    }

    const vendedores = await Visita.distinct('vendedor', {
      fecha: { $gte: rango.desde, $lt: rango.hasta }
    });

    res.json({
      semana,
      desde: rango.desde,
      hasta: rango.hasta,
      vendedoresActivos: vendedores.length,
      vendedores: vendedores.sort()
    });
  } catch (error) { next(error); }
};
