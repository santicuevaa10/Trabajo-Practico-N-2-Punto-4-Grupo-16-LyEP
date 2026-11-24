import bcrypt from 'bcrypt';

// Costo de bcrypt: 10 rondas (~70 ms por hash) es el valor recomendado para
// una API. Subirlo hace cada POST mas lento.
export const RONDAS_BCRYPT = 10;

// Un hash de bcrypt tiene la forma $2b$10$ + 53 caracteres (sal + hash).
// Se aceptan tambien $2a$ y $2y$, que generan otras librerias.
const FORMATO_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export const esHashBcrypt = (valor) =>
  typeof valor === 'string' && FORMATO_HASH.test(valor);

// Hashea solo si hace falta: un valor que ya es un hash se deja igual, asi
// guardar dos veces el mismo documento (o correr la migracion de nuevo) nunca
// hashea un hash.
export const hashearPassword = async (valor) => {
  if (valor === undefined || valor === null || esHashBcrypt(valor)) return valor;
  return bcrypt.hash(String(valor), RONDAS_BCRYPT);
};

export const compararPassword = (valor, hash) => bcrypt.compare(String(valor), hash);

// Hashea "password" dentro de un update de Mongoose, venga como campo suelto
// ({ password }) o dentro de $set / $setOnInsert. Devuelve si cambio algo.
export const hashearPasswordEnUpdate = async (update) => {
  if (!update || typeof update !== 'object' || Array.isArray(update)) return false;
  let cambio = false;
  for (const destino of [update, update.$set, update.$setOnInsert]) {
    if (destino && typeof destino === 'object' && 'password' in destino) {
      const hash = await hashearPassword(destino.password);
      if (hash !== destino.password) {
        destino.password = hash;
        cambio = true;
      }
    }
  }
  return cambio;
};
