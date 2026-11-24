import { ZipArchive } from 'archiver';
import mongoose from 'mongoose';
import {
  ENTIDADES,
  streamCsv,
  escribirJson,
  nombreArchivo
} from '../utils/exportacion.js';

const FORMATOS = ['csv', 'json'];

const prepararDescarga = (res, archivo, contentType) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
  // Sin esto el navegador no deja que el frontend lea el nombre del archivo
  // (la API corre en otro origen: localhost:3001 vs localhost:5173).
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Cache-Control', 'no-store');
};

// GET /exportaciones/clientes?formato=csv|json
export const exportarClientes = async (req, res, next) => {
  const formato = (req.query.formato ?? 'json').toLowerCase();
  if (!FORMATOS.includes(formato)) {
    return res.status(400).json({ error: 'Formato invalido. Use formato=csv o formato=json' });
  }

  const db = mongoose.connection.db;
  const base = nombreArchivo();

  try {
    if (formato === 'json') {
      prepararDescarga(res, `${base}.json`, 'application/json; charset=utf-8');
      await escribirJson(db, res);
      return;
    }

    // CSV: un archivo por entidad dentro de un .zip, todo en streaming.
    prepararDescarga(res, `${base}.zip`, 'application/zip');
    const zip = new ZipArchive({ zlib: { level: 6 } });
    zip.on('warning', (err) => console.warn('Exportacion:', err));
    zip.on('error', (err) => res.destroy(err));
    res.on('close', () => {
      if (!res.writableFinished) zip.abort(); // el cliente cancelo la descarga
    });
    zip.pipe(res);

    for (const entidad of ENTIDADES) {
      zip.append(await streamCsv(db, entidad), { name: `${base}/${entidad.nombre}.csv` });
    }
    await zip.finalize();
  } catch (error) {
    // Si ya empezo la descarga no se puede mandar un JSON de error:
    // se corta la conexion para que el navegador la marque como fallida.
    if (res.headersSent) return res.destroy(error);
    next(error);
  }
};
