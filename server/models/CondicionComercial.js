import mongoose from 'mongoose';

// Registro de auditoria de condiciones comerciales (descuento y limite de credito).
// Es APPEND-ONLY: nunca se edita ni se borra. Cada cambio de condiciones es un
// documento nuevo, y la condicion vigente es la mas reciente cuyo vigenteDesde
// ya llego. Asi queda siempre registro de quien autorizo cada cambio y por que.
const condicionComercialSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true, immutable: true, index: true },
  descuento: { type: Number, required: true, min: 0, max: 100, immutable: true },
  limiteCredito: { type: Number, required: true, min: 0, immutable: true },
  autorizadoPor: { type: String, required: true, trim: true, immutable: true },
  motivo: { type: String, default: '', trim: true, immutable: true },
  vigenteDesde: { type: Date, default: Date.now, immutable: true }
}, { timestamps: true });

const errorAppendOnly = () => {
  const error = new Error('Las condiciones comerciales no se pueden modificar ni eliminar: cargá una nueva');
  error.status = 405;
  return error;
};

// Un save() sobre un documento ya existente seria una edicion.
condicionComercialSchema.pre('save', function (next) {
  if (!this.isNew) return next(errorAppendOnly());
  next();
});

// Bloquea cualquier update o delete hecho por query o por documento.
const operacionesProhibidas = [
  'updateOne', 'updateMany', 'replaceOne',
  'findOneAndUpdate', 'findOneAndReplace',
  'deleteOne', 'deleteMany', 'findOneAndDelete'
];
for (const operacion of operacionesProhibidas) {
  condicionComercialSchema.pre(operacion, { document: true, query: true }, function (next) {
    next(errorAppendOnly());
  });
}

condicionComercialSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('CondicionComercial', condicionComercialSchema);
