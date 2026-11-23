// Calculo del riesgo de fuga de un cliente segun los dias sin compra.
// Es una funcion pura (no importa Mongoose) para poder testearla sin base.

export const ESTADOS = Object.freeze({
  ACTIVO: 'activo',
  EN_RIESGO: 'en_riesgo',
  INACTIVO: 'inactivo'
});

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const leerEntero = (valor, porDefecto) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

// Se leen en cada llamada (no al importar) para que un cambio en .env o en
// los tests se tome sin reiniciar el modulo. Si el valor es invalido se usa
// el default; si quedan invertidos, inactivo nunca es menor que riesgo.
export const obtenerUmbrales = (env = process.env) => {
  const riesgo = leerEntero(env.ALERTA_DIAS_RIESGO, 30);
  const inactivo = leerEntero(env.ALERTA_DIAS_INACTIVO, 60);
  return { riesgo, inactivo: Math.max(inactivo, riesgo) };
};

// Fecha desde la que se cuentan los dias: la ultima compra o, si nunca
// compro, la fecha de alta (un cliente recien cargado no esta en riesgo).
const fechaDeReferencia = (cliente) => {
  for (const valor of [cliente?.ultimaCompra, cliente?.createdAt]) {
    if (valor == null) continue;
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }
  return null;
};

// Dias completos entre la fecha de referencia y hoy. null si no hay fecha.
// Una fecha futura cuenta como 0 dias.
export const calcularDiasSinCompra = (cliente, hoy = new Date()) => {
  const referencia = fechaDeReferencia(cliente);
  if (!referencia) return null;
  const dias = Math.floor((new Date(hoy).getTime() - referencia.getTime()) / MS_POR_DIA);
  return Math.max(0, dias);
};

// "activo" (< riesgo) | "en_riesgo" (>= riesgo y < inactivo) | "inactivo" (>= inactivo).
// Sin ninguna fecha se considera inactivo: no hay forma de saber cuando compro
// por ultima vez, asi que conviene que alguien lo revise.
export const calcularRiesgo = (cliente, hoy = new Date(), umbrales = obtenerUmbrales()) => {
  const dias = calcularDiasSinCompra(cliente, hoy);
  if (dias === null) return ESTADOS.INACTIVO;
  if (dias >= umbrales.inactivo) return ESTADOS.INACTIVO;
  if (dias >= umbrales.riesgo) return ESTADOS.EN_RIESGO;
  return ESTADOS.ACTIVO;
};
