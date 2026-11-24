import mongoose from 'mongoose';

export const TIPOS_DOCUMENTO = ['habilitacion', 'director_tecnico', 'constancia_afip', 'otro'];
// Ventana (en dias) para considerar que un documento esta "por vencer".
export const DIAS_AVISO_VENCIMIENTO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Devuelve "vencido" | "por_vencer" | "ok" para una fecha de vencimiento.
export const estadoDeVencimiento = (vencimiento, dias = DIAS_AVISO_VENCIMIENTO, ahora = new Date()) => {
  const fecha = new Date(vencimiento);
  if (fecha < ahora) return 'vencido';
  if (fecha - ahora <= dias * MS_POR_DIA) return 'por_vencer';
  return 'ok';
};

const transformarJSON = {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};

// Sucursales validas de la distribuidora. Se exporta para reutilizarla en
// la validacion de requests y en el resumen por sucursal.
export const SUCURSALES = ['Casa Central', 'Sucursal Norte', 'Sucursal Sur'];

const documentoSchema = new mongoose.Schema({
  tipo: { type: String, enum: TIPOS_DOCUMENTO, required: true },
  numero: { type: String, default: '' },
  vencimiento: { type: Date, required: true },
  observaciones: { type: String, default: '' }
});
documentoSchema.set('toJSON', transformarJSON);

const clienteSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  name: {
    firstname: { type: String, required: true },
    lastname: { type: String, default: '-' }
  },
  address: {
    street: { type: String, default: '' },
    number: { type: String, default: '' },
    zipcode: { type: String, default: '' },
    city: { type: String, required: true }
  },
  phone: { type: String, required: true },
  sucursal: { type: String, enum: SUCURSALES, default: 'Casa Central' },
  documentos: { type: [documentoSchema], default: [] },
  // Opcionales: alimentan las alertas de inactividad (services/alertasService.js).
  // Se actualizan solos al registrar una visita (POST /users/:id/visitas) y
  // tambien se pueden editar con PUT /users/:id.
  ultimaCompra: { type: Date },
  ultimaVisita: { type: Date }
}, { timestamps: true });

// Estado documental del cliente: el peor estado entre todos sus documentos.
// Un cliente "vencido" no esta habilitado para venta.
clienteSchema.virtual('estadoDocumental').get(function () {
  const estados = (this.documentos ?? []).map((d) => estadoDeVencimiento(d.vencimiento));
  if (estados.includes('vencido')) return 'vencido';
  if (estados.includes('por_vencer')) return 'por_vencer';
  return 'ok';
});

// El frontend espera "id" (string), no "_id" (ObjectId de Mongo).
// Este transform hace que res.json(cliente) devuelva "id" directamente,
// sin tener que tocar ni una linea de clientesService.js en el frontend.
clienteSchema.set('toJSON', transformarJSON);

export default mongoose.model('Cliente', clienteSchema);
