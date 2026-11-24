import { once } from 'node:events';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';

// Entidades que entran en la exportacion. "modelo" es el nombre del modelo
// de Mongoose (si esta registrado se usa su coleccion real) y "coleccion" es
// el nombre por defecto si el modelo todavia no existe en el servidor.
// Si una coleccion no existe en la base, se exporta vacia (sin romper).
//
// Los documentos (habilitaciones, etc.) estan embebidos en cada cliente
// (Cliente.documentos), asi que no tienen coleccion propia: se sacan de
// "clientes" con un $unwind ("pipeline") y se quitan de la fila del cliente
// ("excluir") para no exportarlos dos veces.
export const ENTIDADES = [
  { nombre: 'clientes', modelo: 'Cliente', coleccion: 'clientes', excluir: ['documentos'] },
  {
    nombre: 'documentos',
    modelo: 'Cliente',
    coleccion: 'clientes',
    pipeline: [
      { $unwind: '$documentos' },
      {
        $project: {
          _id: '$documentos._id',
          cliente: '$_id',
          tipo: '$documentos.tipo',
          numero: '$documentos.numero',
          vencimiento: '$documentos.vencimiento',
          observaciones: '$documentos.observaciones'
        }
      }
    ]
  },
  { nombre: 'condiciones_comerciales', modelo: 'CondicionComercial', coleccion: 'condicioncomercials' },
  { nombre: 'visitas', modelo: 'Visita', coleccion: 'visitas' }
];

// Campos que NUNCA salen en una exportacion, en ningun nivel del documento.
const CAMPOS_PROHIBIDOS = new Set(['password', '__v']);

export const resolverColeccion = (entidad) =>
  mongoose.models[entidad.modelo]?.collection.collectionName ?? entidad.coleccion;

// Cursor del driver nativo: lee de a lotes, nunca carga toda la coleccion.
// La proyeccion excluye password en la base misma; limpiarDocumento lo
// vuelve a filtrar por si aparece anidado.
export const abrirCursor = (db, entidad) => {
  const coleccion = db.collection(resolverColeccion(entidad));
  if (entidad.pipeline) {
    return coleccion.aggregate([...entidad.pipeline, { $sort: { _id: 1 } }]);
  }
  const projection = { password: 0, __v: 0 };
  for (const campo of entidad.excluir ?? []) projection[campo] = 0;
  return coleccion.find({}, { projection }).sort({ _id: 1 });
};

const esObjetoPlano = (valor) =>
  valor !== null &&
  typeof valor === 'object' &&
  !Array.isArray(valor) &&
  !(valor instanceof Date) &&
  valor._bsontype === undefined;

// Convierte un documento crudo de Mongo en un objeto apto para exportar:
// _id -> id (string), ObjectId -> string, sin password ni __v.
export const limpiarDocumento = (doc) => {
  if (Array.isArray(doc)) return doc.map(limpiarDocumento);
  if (doc?._bsontype === 'ObjectId') return doc.toString();
  if (!esObjetoPlano(doc)) return doc;

  const limpio = {};
  for (const [clave, valor] of Object.entries(doc)) {
    if (CAMPOS_PROHIBIDOS.has(clave)) continue;
    limpio[clave === '_id' ? 'id' : clave] = limpiarDocumento(valor);
  }
  return limpio;
};

// { name: { firstname: 'A' } } -> { 'name.firstname': 'A' }
export const aplanar = (obj, prefijo = '', salida = {}) => {
  for (const [clave, valor] of Object.entries(obj)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (esObjetoPlano(valor) && Object.keys(valor).length > 0) {
      aplanar(valor, ruta, salida);
    } else {
      salida[ruta] = valor;
    }
  }
  return salida;
};

const aTexto = (valor) => {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

// RFC 4180: comillas si hay coma, comillas o saltos de linea.
export const celdaCsv = (valor) => {
  const texto = aTexto(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

// Primera pasada (streaming): junta las columnas de toda la coleccion sin
// guardar documentos en memoria, solo el conjunto de nombres de columna.
// "id" va siempre primero.
const obtenerColumnas = async (db, entidad) => {
  const columnas = new Set(['id']);
  for await (const doc of abrirCursor(db, entidad)) {
    Object.keys(aplanar(limpiarDocumento(doc))).forEach((c) => columnas.add(c));
  }
  return [...columnas];
};

// Segunda pasada: genera el CSV fila por fila, entregando bloques de ~64 KB
// (mucho mas rapido que un chunk por fila). El BOM hace que Excel muestre
// bien los acentos.
const TAMANO_BLOQUE = 64 * 1024;

async function* filasCsv(db, entidad, columnas) {
  let bloque = '\uFEFF' + columnas.map(celdaCsv).join(',') + '\r\n';
  for await (const doc of abrirCursor(db, entidad)) {
    const plano = aplanar(limpiarDocumento(doc));
    bloque += columnas.map((c) => celdaCsv(plano[c])).join(',') + '\r\n';
    if (bloque.length >= TAMANO_BLOQUE) {
      yield bloque;
      bloque = '';
    }
  }
  if (bloque) yield bloque;
}

export const streamCsv = async (db, entidad) => {
  const columnas = await obtenerColumnas(db, entidad);
  return Readable.from(filasCsv(db, entidad, columnas));
};

// Escribe respetando el backpressure: si el buffer de la respuesta esta
// lleno, espera al evento "drain" antes de seguir leyendo de la base.
// Si el cliente cierra la conexion mientras espera, deja de esperar.
const escribir = async (destino, texto) => {
  if (destino.destroyed) return;
  if (!destino.write(texto)) {
    const corte = new AbortController();
    const { signal } = corte;
    await Promise.race([
      once(destino, 'drain', { signal }),
      once(destino, 'close', { signal })
    ]).finally(() => corte.abort()); // saca el listener que no se disparo
  }
};

// JSON en streaming: { exportadoEn, entidades: { clientes: [...], ... } }
export const escribirJson = async (db, destino, entidades = ENTIDADES) => {
  await escribir(destino, `{"exportadoEn":${JSON.stringify(new Date().toISOString())},"entidades":{`);
  for (const [i, entidad] of entidades.entries()) {
    await escribir(destino, `${i > 0 ? ',' : ''}${JSON.stringify(entidad.nombre)}:[`);
    let primero = true;
    for await (const doc of abrirCursor(db, entidad)) {
      if (destino.destroyed) return; // el cliente cancelo la descarga
      await escribir(destino, (primero ? '' : ',') + JSON.stringify(limpiarDocumento(doc)));
      primero = false;
    }
    await escribir(destino, ']');
  }
  destino.end('}}');
};

// AAAA-MM-DD en la hora local del servidor.
export const nombreArchivo = (fecha = new Date()) => {
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `clientflow-export-${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
};
