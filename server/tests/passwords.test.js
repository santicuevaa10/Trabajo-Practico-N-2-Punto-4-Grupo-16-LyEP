import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import Cliente from '../models/Cliente.js';
import {
  esHashBcrypt,
  hashearPassword,
  hashearPasswordEnUpdate,
  compararPassword
} from '../utils/passwords.js';

// Ejecuta los pre-hooks registrados en el schema sin necesitar una base.
const correrPreHooks = (nombre, contexto, args = []) =>
  promisify((cb) => Cliente.schema.s.hooks.execPre(nombre, contexto, args, cb))();

const datosCliente = (extra = {}) => ({
  email: 'test@ejemplo.com',
  username: 'test',
  password: '1234',
  name: { firstname: 'Test' },
  address: { city: 'Jujuy' },
  phone: '388',
  ...extra
});

describe('utils/passwords', () => {
  test('hashea y el hash valida contra la contraseña original', async () => {
    const hash = await hashearPassword('1234');
    assert.ok(esHashBcrypt(hash));
    assert.ok(hash.startsWith('$2b$10$'));
    assert.equal(await compararPassword('1234', hash), true);
    assert.equal(await compararPassword('otra', hash), false);
  });

  test('un hash no se vuelve a hashear (idempotente)', async () => {
    const hash = await hashearPassword('1234');
    assert.equal(await hashearPassword(hash), hash);
  });

  test('esHashBcrypt reconoce $2a$, $2b$ y $2y$ y rechaza texto plano', () => {
    const resto = '10$' + 'a'.repeat(53);
    assert.ok(esHashBcrypt(`$2a$${resto}`));
    assert.ok(esHashBcrypt(`$2b$${resto}`));
    assert.ok(esHashBcrypt(`$2y$${resto}`));
    assert.equal(esHashBcrypt('1234'), false);
    assert.equal(esHashBcrypt('$2b$10$corto'), false);
    assert.equal(esHashBcrypt(undefined), false);
  });

  test('hashearPasswordEnUpdate cubre campo suelto, $set y $setOnInsert', async () => {
    const update = { password: 'a', $set: { password: 'b', phone: '1' }, $setOnInsert: { password: 'c' } };
    assert.equal(await hashearPasswordEnUpdate(update), true);
    assert.ok(esHashBcrypt(update.password));
    assert.ok(esHashBcrypt(update.$set.password));
    assert.ok(esHashBcrypt(update.$setOnInsert.password));
    assert.equal(update.$set.phone, '1');
    assert.equal(await hashearPasswordEnUpdate({ $set: { phone: '2' } }), false);
  });
});

describe('modelo Cliente', () => {
  test('pre save hashea la contraseña de un cliente nuevo', async () => {
    const cliente = new Cliente(datosCliente());
    await correrPreHooks('save', cliente);
    assert.ok(esHashBcrypt(cliente.password));
    assert.equal(await compararPassword('1234', cliente.password), true);
  });

  test('pre save no re-hashea si la contraseña no cambio', async () => {
    const cliente = new Cliente(datosCliente());
    await correrPreHooks('save', cliente);
    const hash = cliente.password;
    cliente.$__reset(); // simula un documento ya guardado (sin cambios pendientes)
    cliente.phone = '999';
    await correrPreHooks('save', cliente);
    assert.equal(cliente.password, hash);
  });

  test('findOneAndUpdate con password la guarda hasheada', async () => {
    const query = Cliente.findOneAndUpdate({}, { $set: { password: 'nueva' } });
    await correrPreHooks('findOneAndUpdate', query);
    assert.ok(esHashBcrypt(query.getUpdate().$set.password));
  });

  test('insertMany (seed) hashea cada documento', async () => {
    const docs = [datosCliente(), datosCliente({ email: 'b@ejemplo.com', password: 'xyz' })];
    await correrPreHooks('insertMany', Cliente, [docs]);
    assert.ok(docs.every((d) => esHashBcrypt(d.password)));
  });

  test('toJSON no expone la contraseña', () => {
    const json = new Cliente(datosCliente()).toJSON();
    assert.equal('password' in json, false);
    assert.equal(json.email, 'test@ejemplo.com');
    assert.ok(json.id);
    assert.equal('_id' in json, false);
  });
});
