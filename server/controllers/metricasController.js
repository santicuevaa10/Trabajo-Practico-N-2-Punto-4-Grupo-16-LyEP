import Cliente, { SUCURSALES, DIAS_AVISO_VENCIMIENTO } from '../models/Cliente.js';
import Visita from '../models/Visita.js';
import { rangoDeSemanaIso, semanaIsoDeFecha } from '../utils/semanaIso.js';
import { obtenerUmbrales } from '../services/alertasService.js';
import {
  DIAS_RECUPERO,
  rangoDeMeses,
  clientesActivosPorSucursal,
  calcularTasaRetencion,
  contarRecuperados,
  contarDocumentosPorVencer,
  armarComprasPorCliente,
  armarUltimaCompraHasta
} from '../services/metricasService.js';

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

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// GET /metricas/resumen
// Las 5 metricas del bloque 8 en una sola request para la pantalla /metricas.
// Cada formula esta documentada en services/metricasService.js:
//   clientesActivos          -> clientesActivosPorSucursal
//   tasaRetencionMensual     -> calcularTasaRetencion
//   clientesRecuperados      -> contarRecuperados
//   vendedoresActivosSemana  -> vendedores distintos con >= 1 visita en la
//                               semana ISO actual (misma cuenta que
//                               GET /metricas/vendedores-activos)
//   documentosPorVencer      -> contarDocumentosPorVencer
// Lee los clientes con solo los campos necesarios (.lean(), sin password) y
// deja que Mongo agrupe las visitas, asi no se traen visitas una por una.
export const resumenMetricas = async (req, res, next) => {
  try {
    const hoy = new Date();
    const umbrales = obtenerUmbrales();
    const rango = rangoDeMeses(hoy);
    const fechaCorte = new Date(hoy.getTime() - DIAS_RECUPERO * MS_POR_DIA);
    const semana = semanaIsoDeFecha(hoy).texto;
    const { desde, hasta } = rangoDeSemanaIso(semana);

    const [clientes, visitasPorMes, ultimasPorVisitas, vendedores] = await Promise.all([
      Cliente.find({}, 'sucursal ultimaCompra createdAt documentos.vencimiento').lean(),
      // Por cliente: si tuvo algun pedido en el mes actual y/o en el anterior.
      Visita.aggregate([
        { $match: { resultado: 'pedido', fecha: { $gte: rango.inicioMesAnterior, $lte: hoy } } },
        {
          $group: {
            _id: '$cliente',
            mesActual: { $max: { $cond: [{ $gte: ['$fecha', rango.inicioMesActual] }, 1, 0] } },
            mesAnterior: { $max: { $cond: [{ $lt: ['$fecha', rango.inicioMesActual] }, 1, 0] } }
          }
        }
      ]),
      // Por cliente: su ultimo pedido hasta hace 30 dias.
      Visita.aggregate([
        { $match: { resultado: 'pedido', fecha: { $lte: fechaCorte } } },
        { $group: { _id: '$cliente', ultima: { $max: '$fecha' } } }
      ]),
      Visita.distinct('vendedor', { fecha: { $gte: desde, $lt: hasta } })
    ]);

    const comprasPorCliente = armarComprasPorCliente(clientes, visitasPorMes, rango);
    const ultimaCompraHasta = armarUltimaCompraHasta(clientes, ultimasPorVisitas, fechaCorte);

    res.json({
      generadoEn: hoy,
      clientesActivos: clientesActivosPorSucursal(clientes, SUCURSALES, hoy, umbrales),
      tasaRetencionMensual: {
        mesActual: rango.mesActual,
        mesAnterior: rango.mesAnterior,
        ...calcularTasaRetencion(comprasPorCliente)
      },
      clientesRecuperados: contarRecuperados(clientes, ultimaCompraHasta, hoy, umbrales),
      vendedoresActivosSemana: { semana, cantidad: vendedores.length },
      documentosPorVencer: {
        dias: DIAS_AVISO_VENCIMIENTO,
        cantidad: contarDocumentosPorVencer(clientes, hoy)
      }
    });
  } catch (error) { next(error); }
};
