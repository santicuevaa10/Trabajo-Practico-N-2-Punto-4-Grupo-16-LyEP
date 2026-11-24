// Misma regla que el backend (server/models/Cliente.js): un documento esta
// "por vencer" si vence dentro de los proximos 30 dias.
export const DIAS_AVISO_VENCIMIENTO = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export const TIPOS_DOCUMENTO = {
  habilitacion: "Habilitación",
  director_tecnico: "Director técnico",
  constancia_afip: "Constancia AFIP",
  otro: "Otro",
};

export const ESTADOS_DOCUMENTALES = {
  ok: { icono: "✔", etiqueta: "Documentación al día", corto: "Vigente" },
  por_vencer: { icono: "⚠", etiqueta: "Documentación por vencer", corto: "Por vencer" },
  vencido: { icono: "✖", etiqueta: "Documentación vencida", corto: "Vencido" },
};

export const estadoDeVencimiento = (vencimiento, ahora = new Date()) => {
  const fecha = new Date(vencimiento);
  if (fecha < ahora) return "vencido";
  if (fecha - ahora <= DIAS_AVISO_VENCIMIENTO * MS_POR_DIA) return "por_vencer";
  return "ok";
};
