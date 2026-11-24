import Cliente, { DIAS_AVISO_VENCIMIENTO, estadoDeVencimiento } from '../models/Cliente.js';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// GET /alertas?tipo=documentos&dias=30 (lo despacha routes/alertasRoutes.js)
// Devuelve los documentos ya vencidos y los que vencen dentro de los proximos N dias,
// ordenados por fecha de vencimiento (los mas urgentes primero).
export const alertasDocumentos = async (req, res, next) => {
  try {
    const { dias = DIAS_AVISO_VENCIMIENTO } = req.query;
    const tipo = 'documentos';

    const diasNum = Number(dias);
    if (!Number.isInteger(diasNum) || diasNum < 0) {
      return res.status(400).json({ error: 'Parametro "dias" debe ser un entero mayor o igual a 0' });
    }

    const ahora = new Date();
    const limite = new Date(ahora.getTime() + diasNum * MS_POR_DIA);

    const clientes = await Cliente.find({ 'documentos.vencimiento': { $lte: limite } });

    const alertas = clientes.flatMap((cliente) =>
      cliente.documentos
        .filter((doc) => doc.vencimiento <= limite)
        .map((doc) => ({
          clienteId: cliente.id,
          cliente: `${cliente.name.firstname} ${cliente.name.lastname}`.trim(),
          sucursal: cliente.sucursal,
          documento: doc.toJSON(),
          estado: estadoDeVencimiento(doc.vencimiento, diasNum, ahora),
          diasRestantes: Math.ceil((doc.vencimiento - ahora) / MS_POR_DIA)
        }))
    ).sort((a, b) => a.diasRestantes - b.diasRestantes);

    res.json({
      tipo,
      dias: diasNum,
      total: alertas.length,
      vencidos: alertas.filter((a) => a.estado === 'vencido'),
      porVencer: alertas.filter((a) => a.estado === 'por_vencer')
    });
  } catch (error) { next(error); }
};
