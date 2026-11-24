// Resultados posibles de una visita (mismo enum que server/models/Visita.js).
// El orden es el de los botones del modal.
export const RESULTADOS_VISITA = {
  pedido: { etiqueta: "Pedido", icono: "🛒", variante: "success" },
  sin_pedido: { etiqueta: "Sin pedido", icono: "🤝", variante: "secondary" },
  no_atendio: { etiqueta: "No atendió", icono: "🚪", variante: "warning" },
  reclamo: { etiqueta: "Reclamo", icono: "⚠", variante: "danger" },
};

export const MAX_CARACTERES_NOTA = 280;
