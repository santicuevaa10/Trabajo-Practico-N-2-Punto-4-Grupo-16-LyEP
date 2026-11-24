// Hashea con bcrypt las contraseñas que quedaron guardadas en texto plano
// (clientes cargados antes de agregar el hasheo al modelo).
// Por defecto solo muestra lo que haria; para escribir en la base:
//   node documents/migrarPasswords.js --aplicar
// Es idempotente: detecta los hashes de bcrypt ($2b$, y tambien $2a$ / $2y$)
// y los saltea, asi que correrlo dos veces no hashea un hash.
import 'dotenv/config';
import mongoose from 'mongoose';
import Cliente from '../models/Cliente.js';
import { esHashBcrypt, hashearPassword } from '../utils/passwords.js';

const TAMANO_LOTE = 100;
const aplicar = process.argv.includes('--aplicar');

await mongoose.connect(process.env.MONGODB_URI);

// Se usa la coleccion directa (sin hooks de Mongoose) para leer y escribir
// exactamente el campo password, y un cursor para no cargar toda la base.
const coleccion = Cliente.collection;
const cursor = coleccion.find(
  { password: { $exists: true, $type: 'string' } },
  { projection: { password: 1 } }
);

let revisados = 0;
let yaHasheados = 0;
let migrados = 0;
let lote = [];

const escribirLote = async () => {
  if (aplicar && lote.length > 0) await coleccion.bulkWrite(lote, { ordered: false });
  lote = [];
};

for await (const { _id, password } of cursor) {
  revisados++;
  if (esHashBcrypt(password)) {
    yaHasheados++;
    continue;
  }
  migrados++;
  lote.push({
    updateOne: {
      // La condicion incluye el valor viejo: si otro proceso ya la cambio
      // mientras corria el script, no se pisa.
      filter: { _id, password },
      update: { $set: { password: await hashearPassword(password) } }
    }
  });
  if (lote.length >= TAMANO_LOTE) await escribirLote();
}
await escribirLote();

console.log(`Clientes revisados: ${revisados}`);
console.log(`Ya hasheados (se saltean): ${yaHasheados}`);
console.log(`${aplicar ? 'Hasheados ahora' : 'A hashear'}: ${migrados}`);
if (!aplicar && migrados > 0) {
  console.log('Simulacion: no se escribio nada. Usa --aplicar para migrar.');
}

await mongoose.disconnect();
