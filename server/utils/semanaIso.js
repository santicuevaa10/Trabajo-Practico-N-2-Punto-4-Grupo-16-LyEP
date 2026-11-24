// Semanas ISO 8601 ("AAAA-Www", ej. "2026-W48"): arrancan el lunes y la
// semana 1 es la que contiene el primer jueves del año.
//
// Los limites de la semana se calculan en hora de Argentina (UTC-3, sin
// horario de verano), para que una visita del domingo a las 22 h no caiga
// en la semana siguiente por estar ya en lunes en UTC.
const OFFSET_ARGENTINA_MS = -3 * 60 * 60 * 1000;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const FORMATO = /^(\d{4})-W(\d{2})$/;

// Cantidad de semanas ISO del año: 53 si el 28 de diciembre cae en la semana 53.
const semanasDelAnio = (anio) => {
  const { semana } = semanaIsoDeFecha(new Date(Date.UTC(anio, 11, 28, 12) - OFFSET_ARGENTINA_MS));
  return semana;
};

// Fecha -> { anio, semana, texto: "AAAA-Www" } (en hora de Argentina).
export const semanaIsoDeFecha = (fecha) => {
  const local = new Date(fecha.getTime() + OFFSET_ARGENTINA_MS);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const diaSemana = d.getUTCDay() || 7; // lunes = 1 ... domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana); // jueves de esa semana
  const anio = d.getUTCFullYear();
  const semana = Math.ceil(((d - Date.UTC(anio, 0, 1)) / MS_POR_DIA + 1) / 7);
  return { anio, semana, texto: `${anio}-W${String(semana).padStart(2, '0')}` };
};

// "AAAA-Www" -> { desde, hasta } como instantes UTC; hasta es exclusivo
// (lunes 00:00 de la semana siguiente). Devuelve null si el texto es invalido.
export const rangoDeSemanaIso = (texto) => {
  const match = FORMATO.exec(texto ?? '');
  if (!match) return null;
  const anio = Number(match[1]);
  const semana = Number(match[2]);
  if (semana < 1 || semana > semanasDelAnio(anio)) return null;

  // El 4 de enero siempre cae en la semana 1.
  const cuatroDeEnero = Date.UTC(anio, 0, 4);
  const diaSemana = new Date(cuatroDeEnero).getUTCDay() || 7;
  const lunesSemana1 = cuatroDeEnero - (diaSemana - 1) * MS_POR_DIA;
  const lunesLocal = lunesSemana1 + (semana - 1) * 7 * MS_POR_DIA;

  const desde = new Date(lunesLocal - OFFSET_ARGENTINA_MS);
  const hasta = new Date(desde.getTime() + 7 * MS_POR_DIA);
  return { desde, hasta };
};
