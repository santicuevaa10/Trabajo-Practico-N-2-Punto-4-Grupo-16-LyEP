import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularRiesgo,
  calcularDiasSinCompra,
  obtenerUmbrales
} from '../services/alertasService.js';

const HOY = new Date('2026-11-23T12:00:00Z');
const UMBRALES = { riesgo: 30, inactivo: 60 };
const haceDias = (dias) => new Date(HOY.getTime() - dias * 24 * 60 * 60 * 1000);
const riesgo = (cliente) => calcularRiesgo(cliente, HOY, UMBRALES);

describe('calcularRiesgo: casos limite', () => {
  test('0 dias sin compra -> activo', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(0) }), 'activo');
  });

  test('29 dias -> activo (todavia no llega al umbral de riesgo)', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(29) }), 'activo');
  });

  test('30 dias -> en_riesgo (el umbral es inclusivo)', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(30) }), 'en_riesgo');
  });

  test('59 dias -> en_riesgo', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(59) }), 'en_riesgo');
  });

  test('60 dias -> inactivo (el umbral es inclusivo)', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(60) }), 'inactivo');
  });

  test('sin ninguna fecha -> inactivo', () => {
    assert.equal(riesgo({}), 'inactivo');
    assert.equal(calcularDiasSinCompra({}, HOY), null);
  });

  test('sin ultimaCompra usa la fecha de alta', () => {
    assert.equal(riesgo({ createdAt: haceDias(5) }), 'activo');
    assert.equal(riesgo({ createdAt: haceDias(45) }), 'en_riesgo');
  });

  test('ultimaCompra tiene prioridad sobre la fecha de alta', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(2), createdAt: haceDias(400) }), 'activo');
  });

  test('fecha invalida se ignora y fecha futura cuenta como 0 dias', () => {
    assert.equal(riesgo({ ultimaCompra: 'no-es-fecha' }), 'inactivo');
    assert.equal(calcularDiasSinCompra({ ultimaCompra: haceDias(-3) }, HOY), 0);
  });

  test('acepta la fecha como string ISO (como llega de la API)', () => {
    assert.equal(riesgo({ ultimaCompra: haceDias(30).toISOString() }), 'en_riesgo');
  });
});

describe('obtenerUmbrales', () => {
  test('defaults 30 y 60 si no hay variables', () => {
    assert.deepEqual(obtenerUmbrales({}), { riesgo: 30, inactivo: 60 });
  });

  test('toma los valores del entorno', () => {
    assert.deepEqual(
      obtenerUmbrales({ ALERTA_DIAS_RIESGO: '15', ALERTA_DIAS_INACTIVO: '45' }),
      { riesgo: 15, inactivo: 45 }
    );
  });

  test('valores invalidos vuelven al default', () => {
    assert.deepEqual(
      obtenerUmbrales({ ALERTA_DIAS_RIESGO: 'abc', ALERTA_DIAS_INACTIVO: '-5' }),
      { riesgo: 30, inactivo: 60 }
    );
  });

  test('inactivo nunca queda por debajo de riesgo', () => {
    assert.deepEqual(
      obtenerUmbrales({ ALERTA_DIAS_RIESGO: '90', ALERTA_DIAS_INACTIVO: '60' }),
      { riesgo: 90, inactivo: 90 }
    );
  });
});
