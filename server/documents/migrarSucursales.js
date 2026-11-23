// Migra los valores viejos de "sucursal" a los del nuevo enum.
// Por defecto solo muestra lo que haria; para escribir en la base:
//   node documents/migrarSucursales.js --aplicar
// Es idempotente: si se corre dos veces, la segunda no cambia nada.
import 'dotenv/config';
import mongoose from 'mongoose';
import Cliente, { SUCURSALES } from '../models/Cliente.js';

// Valores que usaba el seed anterior. Cualquier otro valor fuera del enum
// (o sin sucursal, que en Mongo matchea con { sucursal: null }) pasa a "Casa Central", que es el default del modelo.
const EQUIVALENCIAS = {
  'Sucursal Jujuy': 'Casa Central',
  'Sucursal Salta': 'Sucursal Norte'
};
const DESTINO_POR_DEFECTO = 'Casa Central';

const aplicar = process.argv.includes('--aplicar');

await mongoose.connect(process.env.MONGODB_URI);

const coleccion = Cliente.collection;
const valores = await coleccion.distinct('sucursal');
const aMigrar = valores.filter((v) => v != null && !SUCURSALES.includes(v));
const sinSucursal = await coleccion.countDocuments({ sucursal: null });

if (aMigrar.length === 0 && sinSucursal === 0) {
  console.log('Nada para migrar: todas las sucursales son validas.');
} else {
  for (const viejo of aMigrar) {
    const nuevo = EQUIVALENCIAS[viejo] ?? DESTINO_POR_DEFECTO;
    const cantidad = await coleccion.countDocuments({ sucursal: viejo });
    console.log(`"${viejo}" -> "${nuevo}" (${cantidad} clientes)`);
    if (aplicar) await coleccion.updateMany({ sucursal: viejo }, { $set: { sucursal: nuevo } });
  }
  if (sinSucursal > 0) {
    console.log(`(sin sucursal) -> "${DESTINO_POR_DEFECTO}" (${sinSucursal} clientes)`);
    if (aplicar) {
      await coleccion.updateMany({ sucursal: null }, { $set: { sucursal: DESTINO_POR_DEFECTO } });
    }
  }
  console.log(aplicar ? 'Migracion aplicada.' : 'Simulacion: no se escribio nada. Usa --aplicar para migrar.');
}

await mongoose.disconnect();
