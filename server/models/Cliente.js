import mongoose from 'mongoose';
// Sucursales validas de la distribuidora. Se exporta para reutilizarla en
// la validacion de requests y en el resumen por sucursal.
export const SUCURSALES = ['Casa Central', 'Sucursal Norte', 'Sucursal Sur'];
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
// Opcionales: alimentan las alertas de inactividad (services/alertasService.js)
ultimaCompra: { type: Date },
ultimaVisita: { type: Date }
}, { timestamps: true });
// El frontend espera "id" (string), no "_id" (ObjectId de Mongo).
// Este transform hace que res.json(cliente) devuelva "id" directamente,
// sin tener que tocar ni una linea de clientesService.js en el frontend.
clienteSchema.set('toJSON', {
virtuals: true,
transform: (_doc, ret) => {
delete ret._id;
delete ret.__v;
return ret;
}
});
export default mongoose.model('Cliente', clienteSchema)
