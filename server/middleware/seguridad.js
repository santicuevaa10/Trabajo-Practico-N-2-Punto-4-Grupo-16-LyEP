import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const ORIGEN_POR_DEFECTO = 'http://localhost:5173';

const leerEntero = (valor, porDefecto) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

// CLIENT_ORIGIN admite uno o varios origenes separados por coma
// (ej. "http://localhost:5173,https://clientflow.vercel.app").
// Se ignora la barra final: "http://localhost:5173/" es el mismo origen.
export const origenesPermitidos = (valor = process.env.CLIENT_ORIGIN) =>
  (valor || ORIGEN_POR_DEFECTO)
    .split(',')
    .map((origen) => origen.trim().replace(/\/+$/, ''))
    .filter(Boolean);

// Headers de seguridad (X-Content-Type-Options, X-Frame-Options, HSTS, saca
// X-Powered-By, etc.). La API solo devuelve JSON y archivos, asi que los
// defaults de helmet no afectan al frontend.
export const headersSeguridad = () => helmet();

// Solo el frontend configurado puede llamar a la API desde un navegador.
// Un origen que no esta en la lista no recibe Access-Control-Allow-Origin y
// el navegador bloquea la respuesta. (curl/Postman no usan CORS: no les afecta.)
export const corsRestringido = () => cors({ origin: origenesPermitidos() });

// Limite de escrituras por IP: solo POST y DELETE (crear clientes, visitas,
// documentos, importar CSV y borrar). Los GET y PUT no se limitan.
// Por defecto 100 por ventana de 15 minutos; se ajusta desde .env.
const METODOS_LIMITADOS = new Set(['POST', 'DELETE']);

export const limitarEscrituras = (env = process.env) => {
  const minutos = leerEntero(env.RATE_LIMIT_VENTANA_MIN, 15);
  return rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: leerEntero(env.RATE_LIMIT_MAX, 100),
    skip: (req) => !METODOS_LIMITADOS.has(req.method),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: `Demasiadas solicitudes. Intente de nuevo en ${minutos} minutos.` }
  });
};
