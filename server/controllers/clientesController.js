import Cliente, { SUCURSALES } from '../models/Cliente.js';
import mongoose from 'mongoose';
export const listarClientes = async (req, res, next) => {
try {
// Filtro opcional ?sucursal=. Sin el parametro, la respuesta es la de siempre.
const { sucursal } = req.query;
if (sucursal !== undefined && !SUCURSALES.includes(sucursal)) {
return res.status(400).json({ error: `Sucursal invalida. Valores posibles: ${SUCURSALES.join(', ')}` });
}
const clientes = await Cliente.find(sucursal ? { sucursal } : {});
res.json(clientes);
} catch (error) { next(error); }
};
export const obtenerCliente = async (req, res, next) => {
try {
const cliente = await Cliente.findById(req.params.id);
if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
res.json(cliente);
} catch (error) { next(error); }
};
export const crearCliente = async (req, res, next) => {
try {
const nuevoCliente = await Cliente.create(req.body);
res.status(201).json(nuevoCliente);
} catch (error) { next(error); }
};
export const eliminarCliente = async (req, res, next) => {
try {
const eliminado = await Cliente.findByIdAndDelete(req.params.id);
if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
res.status(204).send();
} catch (error) { next(error); }
};

// POST /users/:id/documentos -> agrega un documento y devuelve el cliente actualizado
export const agregarDocumento = async (req, res, next) => {
try {
const cliente = await Cliente.findById(req.params.id);
if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
const { tipo, numero, vencimiento, observaciones } = req.body;
cliente.documentos.push({ tipo, numero, vencimiento, observaciones });
await cliente.save();
res.status(201).json(cliente);
} catch (error) { next(error); }
};

// DELETE /users/:id/documentos/:docId -> quita un documento y devuelve el cliente actualizado
export const eliminarDocumento = async (req, res, next) => {
try {
const cliente = await Cliente.findById(req.params.id);
if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
const documento = cliente.documentos.id(req.params.docId);
if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });
documento.deleteOne();
await cliente.save();
res.json(cliente);
} catch (error) { next(error); }
};

// Campos que se pueden editar con PUT. La contraseña, el id y los timestamps
// quedan afuera a proposito.
const CAMPOS_EDITABLES = [
'email', 'username', 'phone', 'sucursal', 'ultimaCompra', 'ultimaVisita',
'name.firstname', 'name.lastname',
'address.street', 'address.number', 'address.zipcode', 'address.city'
];

// Arma un $set con rutas "a.b" para que un PUT parcial como
// { address: { city: 'Salta' } } no borre address.street ni address.number.
const armarActualizacion = (body) => {
const set = {};
for (const ruta of CAMPOS_EDITABLES) {
const [padre, hijo] = ruta.split('.');
const valor = hijo ? body[padre]?.[hijo] : body[padre];
if (valor !== undefined) set[ruta] = typeof valor === 'string' ? valor.trim() : valor;
}
return set;
};

export const actualizarCliente = async (req, res, next) => {
try {
if (!mongoose.isValidObjectId(req.params.id)) {
return res.status(400).json({ error: 'El id del cliente no es valido' });
}
const set = armarActualizacion(req.body);
if (Object.keys(set).length === 0) {
return res.status(400).json({ error: 'No se envio ningun campo editable' });
}
const actualizado = await Cliente.findByIdAndUpdate(
req.params.id,
{ $set: set },
{ new: true, runValidators: true }
);
if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
res.json(actualizado);
} catch (error) {
if (error.code === 11000) {
return res.status(409).json({ error: 'Ya existe un cliente con ese email' });
}
next(error);
}
};

// Resumen por sucursal para el Dashboard. Las 3 sucursales aparecen siempre
// (con 0 si no tienen clientes); un valor viejo fuera del enum aparece al final
// con su nombre original, para que se note y se pueda migrar.
export const resumenSucursales = async (req, res, next) => {
try {
const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const grupos = await Cliente.aggregate([
{
$group: {
// Documentos viejos sin el campo cuentan como Casa Central (el default).
_id: { $ifNull: ['$sucursal', 'Casa Central'] },
totalClientes: { $sum: 1 },
nuevosUltimos30Dias: {
$sum: { $cond: [{ $gte: ['$createdAt', hace30Dias] }, 1, 0] }
}
}
},
{ $project: { _id: 0, sucursal: '$_id', totalClientes: 1, nuevosUltimos30Dias: 1 } }
]);
const porNombre = new Map(grupos.map((g) => [g.sucursal, g]));
const resumen = SUCURSALES.map((sucursal) =>
porNombre.get(sucursal) ?? { sucursal, totalClientes: 0, nuevosUltimos30Dias: 0 }
);
const fueraDelEnum = grupos.filter((g) => !SUCURSALES.includes(g.sucursal));
res.json([...resumen, ...fueraDelEnum]);
} catch (error) { next(error); }
};
