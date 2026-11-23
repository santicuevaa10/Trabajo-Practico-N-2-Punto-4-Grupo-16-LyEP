import { SUCURSALES } from '../models/Cliente.js';

// Sin esto, una sucursal fuera del enum llega a Mongoose y termina en un 500.
const sucursalInvalida = (body) =>
'sucursal' in body && !SUCURSALES.includes(body.sucursal);
const errorSucursal = { error: `Sucursal invalida. Valores posibles: ${SUCURSALES.join(', ')}` };

// ultimaCompra / ultimaVisita: fecha ISO valida o null (para borrarla).
// Sin esto, una fecha mal escrita termina en un CastError (500).
const CAMPOS_FECHA = ['ultimaCompra', 'ultimaVisita'];
const fechasInvalidas = (body) =>
CAMPOS_FECHA.filter((campo) => {
if (!(campo in body) || body[campo] === null) return false;
const valor = body[campo];
return typeof valor !== 'string' || Number.isNaN(new Date(valor).getTime());
});
const responderFechasInvalidas = (res, campos) =>
res.status(400).json({ error: `Fecha invalida en: ${campos.join(', ')} (usar formato ISO, ej. 2026-11-23)` });

export const validarCliente = (req, res, next) => {
const { email, name, address, phone } = req.body;
if (!email || !name?.firstname || !address?.city || !phone) {
return res.status(400).json({
error: 'Faltan campos obligatorios: email, name.firstname, address.city, phone'
});
}
if (sucursalInvalida(req.body)) return res.status(400).json(errorSucursal);
const fechasMal = fechasInvalidas(req.body);
if (fechasMal.length > 0) return responderFechasInvalidas(res, fechasMal);
next();
};

// En PUT los campos son parciales: solo se valida lo que viene en el body.
// Un campo obligatorio puede omitirse, pero no puede mandarse vacio.
const vacio = (valor) => typeof valor !== 'string' || valor.trim() === '';

export const validarClienteParcial = (req, res, next) => {
const body = req.body;
if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
return res.status(400).json({ error: 'El body debe ser un objeto con al menos un campo a actualizar' });
}
const { email, name, address, phone } = body;
const errores = [];
if ('email' in body && vacio(email)) errores.push('email');
if ('phone' in body && vacio(phone)) errores.push('phone');
if (name && 'firstname' in name && vacio(name.firstname)) errores.push('name.firstname');
if (address && 'city' in address && vacio(address.city)) errores.push('address.city');
if (errores.length > 0) {
return res.status(400).json({ error: `Estos campos no pueden quedar vacios: ${errores.join(', ')}` });
}
if (sucursalInvalida(body)) return res.status(400).json(errorSucursal);
const fechasMal = fechasInvalidas(body);
if (fechasMal.length > 0) return responderFechasInvalidas(res, fechasMal);
next();
};
