export const validarCliente = (req, res, next) => {
const { email, name, address, phone } = req.body;
if (!email || !name?.firstname || !address?.city || !phone) {
return res.status(400).json({
error: 'Faltan campos obligatorios: email, name.firstname, address.city, phone'
});
}
next();
};
