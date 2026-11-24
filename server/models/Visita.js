import mongoose from 'mongoose';

export const RESULTADOS_VISITA = ['pedido', 'sin_pedido', 'no_atendio', 'reclamo'];
export const MAX_CARACTERES_NOTA = 280;

const visitaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
  vendedor: { type: String, required: true, trim: true },
  fecha: { type: Date, default: Date.now },
  resultado: { type: String, enum: RESULTADOS_VISITA, required: true },
  nota: { type: String, default: '', trim: true, maxlength: MAX_CARACTERES_NOTA }
}, { timestamps: true });

// "Ultimas N visitas de un cliente" y "vendedores con visitas en una semana".
visitaSchema.index({ cliente: 1, fecha: -1 });
visitaSchema.index({ fecha: 1, vendedor: 1 });

visitaSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Visita', visitaSchema);
