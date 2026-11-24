import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import Cliente from '../models/Cliente.js';
import mapeoTango from '../config/mapeoTango.json' with { type: 'json' };

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Error que invalida el archivo entero (no una fila puntual) -> 400.
const errorDeArchivo = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
};

// Los exports de Tango suelen venir en Windows-1252 (ANSI) y no en UTF-8.
// Se intenta UTF-8 estricto y, si hay bytes invalidos, se decodifica como 1252
// para no romper los acentos ("Droguería", "Tucumán").
const decodificar = (buffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
};

const parsearCsv = (buffer) => {
  try {
    return parse(decodificar(buffer), {
      columns: (encabezados) => encabezados.map((c) => c.trim().toUpperCase()),
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true, // una fila con columnas de mas/menos se valida, no aborta
      delimiter: [';', ',', '\t'],
      info: true
    });
  } catch (error) {
    throw errorDeArchivo(`No se pudo leer el CSV: ${error.message}`);
  }
};

// Mapeo normalizado: { COLUMNA_EN_MAYUSCULAS: 'campo.del.modelo' }
const normalizarMapeo = (mapeo) =>
  Object.fromEntries(Object.entries(mapeo).map(([col, campo]) => [col.trim().toUpperCase(), campo]));

// Convierte un error de validacion de Mongoose en un motivo legible que
// nombra la columna del CSV (no el campo interno del modelo).
const motivoDeValidacion = (error, columnaDeCampo) =>
  Object.values(error.errors)
    .map((e) => {
      const columna = columnaDeCampo[e.path] ?? e.path;
      return e.kind === 'required' ? `Falta ${columna}` : `${columna}: ${e.message}`;
    })
    .join('; ');

// Importa (o simula importar) clientes desde un CSV exportado del ERP.
// Hace upsert por email. Una fila invalida se reporta y se saltea: no aborta
// el resto. Con simulacion = true valida todo pero no escribe en la base.
export const importarClientes = async (buffer, { simulacion = false, mapeo = mapeoTango } = {}) => {
  const columnas = normalizarMapeo(mapeo);
  const columnaDeCampo = Object.fromEntries(Object.entries(columnas).map(([col, campo]) => [campo, col]));
  const columnaEmail = columnaDeCampo.email;
  if (!columnaEmail) throw new Error('El mapeo no define que columna corresponde a "email"');

  const registros = parsearCsv(buffer);
  if (registros.length === 0) throw errorDeArchivo('El archivo no tiene filas de datos');

  const encabezados = Object.keys(registros[0].record);
  if (!encabezados.includes(columnaEmail)) {
    throw errorDeArchivo(`Falta la columna ${columnaEmail}: es la que se usa para identificar al cliente`);
  }
  const columnasFaltantes = Object.keys(columnas).filter((c) => !encabezados.includes(c));

  // Una sola consulta para saber cuales emails ya existen.
  const emails = registros
    .map(({ record }) => record[columnaEmail]?.toLowerCase())
    .filter(Boolean);
  const existentes = await Cliente.find({ email: { $in: emails } });
  const porEmail = new Map(existentes.map((c) => [c.email.toLowerCase(), c]));

  const resultado = {
    simulacion,
    creados: 0,
    actualizados: 0,
    sinCambios: 0,
    errores: [],
    columnasFaltantes,
    detalle: []
  };
  const filaDeEmail = new Map();

  for (const { record, info } of registros) {
    const fila = info.lines; // linea del archivo (el encabezado es la 1)
    const email = record[columnaEmail]?.toLowerCase() ?? '';
    const nombre = record[columnaDeCampo['name.firstname']] ?? '';

    const registrarError = (motivo) => {
      resultado.errores.push({ fila, motivo });
      resultado.detalle.push({ fila, email, nombre, accion: 'error', motivo });
    };

    if (!email) { registrarError(`Falta ${columnaEmail}`); continue; }
    if (!FORMATO_EMAIL.test(email)) { registrarError(`${columnaEmail} invalido: "${email}"`); continue; }
    if (filaDeEmail.has(email)) {
      registrarError(`Email repetido en el archivo (ya aparece en la fila ${filaDeEmail.get(email)})`);
      continue;
    }
    filaDeEmail.set(email, fila);

    // Solo se copian las celdas con valor: una celda vacia no pisa el dato que ya hay.
    const campos = {};
    for (const [columna, campo] of Object.entries(columnas)) {
      const valor = record[columna];
      if (valor !== undefined && valor !== '') campos[campo] = valor;
    }
    campos.email = email;

    const existente = porEmail.get(email);
    const doc = existente ?? new Cliente({
      // El ERP no trae credenciales: se generan para cumplir con el modelo.
      username: email.split('@')[0],
      password: crypto.randomBytes(12).toString('hex')
    });
    doc.set(campos);

    const errorValidacion = doc.validateSync();
    if (errorValidacion) { registrarError(motivoDeValidacion(errorValidacion, columnaDeCampo)); continue; }

    const accion = !existente ? 'crear' : doc.isModified() ? 'actualizar' : 'sin_cambios';

    if (!simulacion && accion !== 'sin_cambios') {
      try {
        await doc.save();
      } catch (error) {
        registrarError(error.code === 11000 ? 'El email ya existe en la base' : error.message);
        continue;
      }
    }

    if (accion === 'crear') resultado.creados++;
    else if (accion === 'actualizar') resultado.actualizados++;
    else resultado.sinCambios++;

    resultado.detalle.push({
      fila,
      email,
      nombre,
      accion,
      cambios: existente ? doc.modifiedPaths({ includeChildren: false }).filter((p) => p in campos) : undefined
    });
  }

  return resultado;
};
