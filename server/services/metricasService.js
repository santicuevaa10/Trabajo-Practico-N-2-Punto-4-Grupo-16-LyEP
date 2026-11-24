// Calculos de las metricas del bloque 8 ("por que pagar ClientFlow si Excel +
// WhatsApp es gratis"). Son funciones puras (no importan Mongoose) para poder
// testearlas sin base, igual que services/alertasService.js.
import { ESTADOS, calcularRiesgo, obtenerUmbrales } from './alertasService.js';
import { estadoDeVencimiento, DIAS_AVISO_VENCIMIENTO } from '../models/Cliente.js';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
// Los meses se cortan en hora de Argentina (UTC-3, sin horario de verano),
// igual que las semanas de utils/semanaIso.js: un pedido del 31 a las 22 h
// es de ese mes aunque en UTC ya sea dia 1.
const OFFSET_ARGENTINA_MS = -3 * 60 * 60 * 1000;
export const DIAS_RECUPERO = 30;

// Fecha -> { inicioMesActual, inicioMesAnterior, mesActual: 'AAAA-MM', mesAnterior: 'AAAA-MM' }
export const rangoDeMeses = (hoy = new Date()) => {
  const local = new Date(hoy.getTime() + OFFSET_ARGENTINA_MS);
  const anio = local.getUTCFullYear();
  const mes = local.getUTCMonth();
  const inicio = (a, m) => new Date(Date.UTC(a, m, 1) - OFFSET_ARGENTINA_MS);
  const texto = (fecha) => {
    const l = new Date(fecha.getTime() + OFFSET_ARGENTINA_MS);
    return `${l.getUTCFullYear()}-${String(l.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const inicioMesActual = inicio(anio, mes);
  const inicioMesAnterior = inicio(anio, mes - 1); // Date.UTC acepta mes -1 (diciembre del anio anterior)
  return {
    inicioMesActual,
    inicioMesAnterior,
    mesActual: texto(inicioMesActual),
    mesAnterior: texto(inicioMesAnterior)
  };
};

const fechaValida = (valor) => {
  if (valor == null) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

// Clientes activos por sucursal.
// FORMULA: un cliente es "activo" si calcularRiesgo() lo da como activo, es
// decir, tiene menos de ALERTA_DIAS_RIESGO (30 por defecto) dias sin compra,
// contando desde ultimaCompra o, si nunca compro, desde su alta. Es el mismo
// criterio que usan las alertas, asi las dos pantallas nunca se contradicen.
// Las sucursales del enum aparecen siempre (aunque tengan 0), y una sucursal
// fuera del enum (datos viejos) se agrega al final en vez de perderse.
export const clientesActivosPorSucursal = (clientes, sucursales, hoy = new Date(), umbrales = obtenerUmbrales()) => {
  const conteo = new Map(sucursales.map((s) => [s, { sucursal: s, activos: 0, total: 0 }]));
  for (const cliente of clientes) {
    const sucursal = cliente.sucursal ?? 'Casa Central';
    if (!conteo.has(sucursal)) conteo.set(sucursal, { sucursal, activos: 0, total: 0 });
    const fila = conteo.get(sucursal);
    fila.total += 1;
    if (calcularRiesgo(cliente, hoy, umbrales) === ESTADOS.ACTIVO) fila.activos += 1;
  }
  const porSucursal = [...conteo.values()];
  return {
    total: porSucursal.reduce((suma, fila) => suma + fila.activos, 0),
    porSucursal
  };
};

// Tasa de retencion mensual.
// FORMULA: retenidos / clientesMesAnterior, donde
//   clientesMesAnterior = clientes con al menos 1 compra en el mes calendario anterior
//   retenidos           = de esos, los que tambien compraron en el mes en curso
// "Compra" = visita con resultado "pedido" o cliente.ultimaCompra dentro del mes
// (ultimaCompra cubre compras cargadas a mano o importadas sin visita).
// El mes en curso esta incompleto: a principio de mes la tasa arranca baja y
// sube a medida que los clientes vuelven a comprar.
// Si nadie compro el mes anterior la tasa es null (no hay base para calcularla).
//
// comprasPorCliente: Map<idCliente, { mesActual: boolean, mesAnterior: boolean }>
export const calcularTasaRetencion = (comprasPorCliente) => {
  let clientesMesAnterior = 0;
  let retenidos = 0;
  for (const compras of comprasPorCliente.values()) {
    if (!compras.mesAnterior) continue;
    clientesMesAnterior += 1;
    if (compras.mesActual) retenidos += 1;
  }
  return {
    clientesMesAnterior,
    retenidos,
    tasa: clientesMesAnterior > 0 ? retenidos / clientesMesAnterior : null
  };
};

// Clientes recuperados.
// FORMULA: clientes que hace DIAS_RECUPERO (30) dias estaban en_riesgo o
// inactivo y hoy estan activos. El estado de hace 30 dias se recalcula con
// calcularRiesgo() usando como "ultima compra" la ultima compra conocida
// hasta esa fecha (ultimaCompraHasta). Un cliente dado de alta despues de esa
// fecha no existia todavia, asi que no cuenta como recuperado.
// Limitacion: el historial sale de las visitas con pedido. Si a un cliente se
// le edito ultimaCompra a mano (PUT) sin registrar visitas, no hay forma de
// saber cuando compro antes de esa fecha y se toma su alta como referencia.
//
// ultimaCompraHasta: Map<idCliente, Date> con la ultima compra <= hace 30 dias.
export const contarRecuperados = (clientes, ultimaCompraHasta, hoy = new Date(), umbrales = obtenerUmbrales()) => {
  const fechaCorte = new Date(hoy.getTime() - DIAS_RECUPERO * MS_POR_DIA);
  let recuperados = 0;
  for (const cliente of clientes) {
    const alta = fechaValida(cliente.createdAt);
    if (alta && alta > fechaCorte) continue;

    const antes = calcularRiesgo(
      { ultimaCompra: ultimaCompraHasta.get(String(cliente._id)), createdAt: cliente.createdAt },
      fechaCorte,
      umbrales
    );
    const ahora = calcularRiesgo(cliente, hoy, umbrales);
    if (antes !== ESTADOS.ACTIVO && ahora === ESTADOS.ACTIVO) recuperados += 1;
  }
  return recuperados;
};

// Documentos por vencer.
// FORMULA: cantidad de documentos (de todos los clientes) cuyo vencimiento cae
// entre hoy y los proximos DIAS_AVISO_VENCIMIENTO (30) dias. Los ya vencidos
// no cuentan aca: ya aparecen en /alertas?tipo=documentos.
export const contarDocumentosPorVencer = (clientes, hoy = new Date(), dias = DIAS_AVISO_VENCIMIENTO) =>
  clientes.reduce(
    (suma, cliente) =>
      suma + (cliente.documentos ?? []).filter(
        (doc) => estadoDeVencimiento(doc.vencimiento, dias, hoy) === 'por_vencer'
      ).length,
    0
  );

// Une las compras que vienen de visitas con cliente.ultimaCompra.
// visitasPorMes: [{ _id: idCliente, mesActual: 0|1, mesAnterior: 0|1 }]
export const armarComprasPorCliente = (clientes, visitasPorMes, rango) => {
  const compras = new Map();
  for (const fila of visitasPorMes) {
    compras.set(String(fila._id), { mesActual: Boolean(fila.mesActual), mesAnterior: Boolean(fila.mesAnterior) });
  }
  for (const cliente of clientes) {
    const fecha = fechaValida(cliente.ultimaCompra);
    if (!fecha || fecha < rango.inicioMesAnterior) continue;
    const id = String(cliente._id);
    const actual = compras.get(id) ?? { mesActual: false, mesAnterior: false };
    if (fecha >= rango.inicioMesActual) actual.mesActual = true;
    else actual.mesAnterior = true;
    compras.set(id, actual);
  }
  return compras;
};

// Une la ultima compra por visitas (<= fecha de corte) con cliente.ultimaCompra.
// ultimasPorVisitas: [{ _id: idCliente, ultima: Date }]
export const armarUltimaCompraHasta = (clientes, ultimasPorVisitas, fechaCorte) => {
  const ultimas = new Map(ultimasPorVisitas.map((fila) => [String(fila._id), new Date(fila.ultima)]));
  for (const cliente of clientes) {
    const fecha = fechaValida(cliente.ultimaCompra);
    if (!fecha || fecha > fechaCorte) continue;
    const id = String(cliente._id);
    const previa = ultimas.get(id);
    if (!previa || fecha > previa) ultimas.set(id, fecha);
  }
  return ultimas;
};
