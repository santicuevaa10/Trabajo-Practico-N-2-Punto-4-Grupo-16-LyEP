import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  rangoDeMeses,
  clientesActivosPorSucursal,
  calcularTasaRetencion,
  contarRecuperados,
  contarDocumentosPorVencer,
  armarComprasPorCliente,
  armarUltimaCompraHasta
} from '../services/metricasService.js';

const HOY = new Date('2026-11-23T12:00:00Z');
const UMBRALES = { riesgo: 30, inactivo: 60 };
const SUCURSALES = ['Casa Central', 'Sucursal Norte', 'Sucursal Sur'];
const haceDias = (dias) => new Date(HOY.getTime() - dias * 24 * 60 * 60 * 1000);
const enDias = (dias) => new Date(HOY.getTime() + dias * 24 * 60 * 60 * 1000);

describe('rangoDeMeses', () => {
  test('corta los meses en hora de Argentina', () => {
    const rango = rangoDeMeses(HOY);
    assert.equal(rango.mesActual, '2026-11');
    assert.equal(rango.mesAnterior, '2026-10');
    assert.equal(rango.inicioMesActual.toISOString(), '2026-11-01T03:00:00.000Z');
    assert.equal(rango.inicioMesAnterior.toISOString(), '2026-10-01T03:00:00.000Z');
  });

  test('el 1 de enero a la 1 AM UTC todavia es diciembre en Argentina', () => {
    const rango = rangoDeMeses(new Date('2027-01-01T01:00:00Z'));
    assert.equal(rango.mesActual, '2026-12');
    assert.equal(rango.mesAnterior, '2026-11');
  });

  test('en enero el mes anterior es diciembre del anio pasado', () => {
    const rango = rangoDeMeses(new Date('2027-01-15T12:00:00Z'));
    assert.equal(rango.mesAnterior, '2026-12');
  });
});

describe('clientesActivosPorSucursal', () => {
  test('cuenta activos y total por sucursal, con las 3 sucursales siempre presentes', () => {
    const clientes = [
      { sucursal: 'Casa Central', ultimaCompra: haceDias(5) },
      { sucursal: 'Casa Central', ultimaCompra: haceDias(45) },
      { sucursal: 'Sucursal Norte', ultimaCompra: haceDias(29) },
      { sucursal: 'Vieja', ultimaCompra: haceDias(1) }
    ];
    const resultado = clientesActivosPorSucursal(clientes, SUCURSALES, HOY, UMBRALES);
    assert.equal(resultado.total, 3);
    assert.deepEqual(resultado.porSucursal, [
      { sucursal: 'Casa Central', activos: 1, total: 2 },
      { sucursal: 'Sucursal Norte', activos: 1, total: 1 },
      { sucursal: 'Sucursal Sur', activos: 0, total: 0 },
      { sucursal: 'Vieja', activos: 1, total: 1 }
    ]);
  });
});

describe('calcularTasaRetencion', () => {
  test('retenidos / clientes que compraron el mes anterior', () => {
    const compras = new Map([
      ['a', { mesAnterior: true, mesActual: true }],
      ['b', { mesAnterior: true, mesActual: false }],
      ['c', { mesAnterior: true, mesActual: true }],
      ['d', { mesAnterior: false, mesActual: true }] // nuevo este mes: no entra en la base
    ]);
    assert.deepEqual(calcularTasaRetencion(compras), { clientesMesAnterior: 3, retenidos: 2, tasa: 2 / 3 });
  });

  test('sin compras el mes anterior la tasa es null', () => {
    assert.equal(calcularTasaRetencion(new Map()).tasa, null);
  });
});

describe('armarComprasPorCliente', () => {
  test('suma ultimaCompra a las compras que vienen de visitas', () => {
    const rango = rangoDeMeses(HOY);
    const clientes = [
      { _id: 'a', ultimaCompra: haceDias(2) }, // noviembre, sin visita
      { _id: 'b', ultimaCompra: new Date('2026-10-10T12:00:00Z') },
      { _id: 'c', ultimaCompra: new Date('2026-08-01T12:00:00Z') } // muy vieja: se ignora
    ];
    const compras = armarComprasPorCliente(clientes, [{ _id: 'a', mesActual: 0, mesAnterior: 1 }], rango);
    assert.deepEqual(compras.get('a'), { mesActual: true, mesAnterior: true });
    assert.deepEqual(compras.get('b'), { mesActual: false, mesAnterior: true });
    assert.equal(compras.has('c'), false);
  });
});

describe('contarRecuperados', () => {
  const corte = haceDias(30);

  test('en_riesgo o inactivo hace 30 dias y activo hoy -> recuperado', () => {
    const clientes = [
      // ultima compra antes del corte: hace 70 dias -> hace 30 dias llevaba 40 (en_riesgo)
      { _id: 'riesgo', createdAt: haceDias(400), ultimaCompra: haceDias(3) },
      // hace 30 dias llevaba 70 sin comprar (inactivo)
      { _id: 'inactivo', createdAt: haceDias(400), ultimaCompra: haceDias(10) },
      // hace 30 dias estaba activo (compro 5 dias antes del corte)
      { _id: 'siempreActivo', createdAt: haceDias(400), ultimaCompra: haceDias(1) },
      // sigue sin comprar hoy
      { _id: 'sigueInactivo', createdAt: haceDias(400), ultimaCompra: haceDias(90) },
      // dado de alta hace 10 dias: no existia hace 30
      { _id: 'nuevo', createdAt: haceDias(10), ultimaCompra: haceDias(2) }
    ];
    const ultimas = armarUltimaCompraHasta(
      clientes,
      [
        { _id: 'riesgo', ultima: haceDias(70) },
        { _id: 'inactivo', ultima: haceDias(100) },
        { _id: 'siempreActivo', ultima: haceDias(35) }
      ],
      corte
    );
    assert.equal(contarRecuperados(clientes, ultimas, HOY, UMBRALES), 2);
  });

  test('armarUltimaCompraHasta usa ultimaCompra si es anterior al corte y mas nueva que la visita', () => {
    const clientes = [{ _id: 'x', ultimaCompra: haceDias(40) }];
    const ultimas = armarUltimaCompraHasta(clientes, [{ _id: 'x', ultima: haceDias(80) }], corte);
    assert.equal(ultimas.get('x').getTime(), haceDias(40).getTime());
  });
});

describe('contarDocumentosPorVencer', () => {
  test('cuenta solo los que vencen en los proximos 30 dias, no los vencidos', () => {
    const clientes = [
      { documentos: [{ vencimiento: enDias(5) }, { vencimiento: haceDias(1) }] },
      { documentos: [{ vencimiento: enDias(30) }, { vencimiento: enDias(31) }] },
      {}
    ];
    assert.equal(contarDocumentosPorVencer(clientes, HOY), 2);
  });
});
