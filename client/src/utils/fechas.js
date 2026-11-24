// Helpers de fechas compartidos entre secciones de la ficha del cliente.

export const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString("es-AR");

// <input type="date"> devuelve "AAAA-MM-DD"; new Date() lo interpreta como
// medianoche UTC, que en Argentina es el dia anterior. Se toma el final del
// dia en hora local: el documento es valido durante todo su dia de vencimiento.
export const fechaInputAISO = (valor) =>
  new Date(`${valor}T23:59:59`).toISOString();

// Igual que fechaInputAISO pero tomando el INICIO del dia local: una condicion
// "vigente desde hoy" tiene que aplicar desde ya, no recien a la noche.
export const fechaInputAInicioDelDiaISO = (valor) =>
  new Date(`${valor}T00:00:00`).toISOString();

// Fecha de hoy en formato "AAAA-MM-DD" (hora local) para <input type="date">.
export const hoyParaInput = () => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
};
