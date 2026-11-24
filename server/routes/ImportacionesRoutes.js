import { Router } from 'express';
import multer from 'multer';
import { importarClientesCsv } from '../controllers/importacionesController.js';

export const TAMANIO_MAXIMO_CSV = 2 * 1024 * 1024; // 2 MB

// En memoria: el CSV se parsea directo del buffer, nunca se escribe a disco.
const subirCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANIO_MAXIMO_CSV, files: 1 },
  fileFilter: (_req, archivo, cb) => {
    if (/\.csv$/i.test(archivo.originalname)) return cb(null, true);
    const error = new Error('El archivo tiene que ser un .csv');
    error.status = 400;
    cb(error);
  }
});

const router = Router();

router.post('/clientes', subirCsv.single('archivo'), importarClientesCsv);

export default router;
