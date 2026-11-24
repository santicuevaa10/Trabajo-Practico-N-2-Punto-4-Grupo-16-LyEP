import { TIPOS_DOCUMENTO } from '../models/Cliente.js';

export const validarDocumento = (req, res, next) => {
  const { tipo, vencimiento } = req.body;
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    return res.status(400).json({
      error: `Campo "tipo" invalido. Valores admitidos: ${TIPOS_DOCUMENTO.join(', ')}`
    });
  }
  if (!vencimiento || Number.isNaN(new Date(vencimiento).getTime())) {
    return res.status(400).json({ error: 'Campo "vencimiento" obligatorio y debe ser una fecha valida' });
  }
  next();
};
