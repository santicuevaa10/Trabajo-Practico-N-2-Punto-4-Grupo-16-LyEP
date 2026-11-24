import "../css/metricas.css";
import { useEffect, useState } from "react";
import useAutorizaciones from "../hooks/useAutorizaciones";
import metricasService from "../services/metricasService";

// "2026-10" -> "octubre"
const nombreDelMes = (texto) => {
  const [anio, mes] = (texto ?? "").split("-").map(Number);
  if (!anio || !mes) return texto ?? "";
  return new Date(Date.UTC(anio, mes - 1, 15)).toLocaleDateString("es-AR", {
    month: "long",
    timeZone: "UTC",
  });
};

const porcentaje = (tasa) =>
  tasa === null || tasa === undefined ? "—" : `${Math.round(tasa * 100)}%`;

// El backend devuelve un objeto con estas 5 claves. FakeStoreAPI (o una
// VITE_API_URL mal configurada) no: se trata como "no disponible".
const esResumenValido = (datos) =>
  Boolean(
    datos?.clientesActivos?.porSucursal &&
      datos.tasaRetencionMensual &&
      datos.vendedoresActivosSemana &&
      datos.documentosPorVencer &&
      typeof datos.clientesRecuperados === "number"
  );

// Geometria del grafico (unidades del viewBox; el SVG escala al ancho).
const ANCHO = 480;
const ANCHO_ETIQUETA = 130; // nombre de la sucursal
const ANCHO_VALOR = 95; // "12 de 20" a la derecha de la barra
const ALTO_FILA = 44;
const GROSOR_BARRA = 20;
const RADIO = 4;

// Barra horizontal: recta contra la linea base, redondeada solo en la punta.
const caminoBarra = (x, y, ancho, alto, radio) => {
  const r = Math.min(radio, ancho);
  return [
    `M${x},${y}`,
    `H${x + ancho - r}`,
    `Q${x + ancho},${y} ${x + ancho},${y + r}`,
    `V${y + alto - r}`,
    `Q${x + ancho},${y + alto} ${x + ancho - r},${y + alto}`,
    `H${x}`,
    "Z",
  ].join(" ");
};

// Clientes activos sobre el total de cada sucursal. El "riel" claro es el
// total y la barra llena son los activos, asi se ve la proporcion de un vistazo.
const GraficoSucursales = ({ datos }) => {
  const maximo = Math.max(1, ...datos.map((d) => d.total));
  const anchoUtil = ANCHO - ANCHO_ETIQUETA - ANCHO_VALOR;
  const alto = datos.length * ALTO_FILA;
  const escala = (valor) => (valor / maximo) * anchoUtil;

  const resumen = datos
    .map((d) => `${d.sucursal}: ${d.activos} activos de ${d.total}`)
    .join("; ");

  return (
    <figure className="grafico-sucursales">
      <div className="grafico-leyenda" aria-hidden="true">
        <span><i className="muestra muestra-activos" /> Clientes activos</span>
        <span><i className="muestra muestra-total" /> Total de clientes</span>
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        role="img"
        aria-label={`Clientes activos por sucursal. ${resumen}`}
      >
        {datos.map((d, i) => {
          const y = i * ALTO_FILA + (ALTO_FILA - GROSOR_BARRA) / 2;
          const centro = y + GROSOR_BARRA / 2;
          const anchoTotal = escala(d.total);
          const anchoActivos = escala(d.activos);
          return (
            <g key={d.sucursal} className="fila-barra">
              <title>{`${d.sucursal}: ${d.activos} activos de ${d.total} clientes`}</title>
              {/* Zona de hover de toda la fila, mas grande que la barra */}
              <rect x="0" y={i * ALTO_FILA} width={ANCHO} height={ALTO_FILA} fill="transparent" />
              <text className="etiqueta-sucursal" x={ANCHO_ETIQUETA - 12} y={centro} textAnchor="end" dominantBaseline="middle">
                {d.sucursal}
              </text>
              {anchoTotal > 0 && (
                <path className="barra-total" d={caminoBarra(ANCHO_ETIQUETA, y, anchoTotal, GROSOR_BARRA, RADIO)} />
              )}
              {anchoActivos > 0 && (
                <path className="barra-activos" d={caminoBarra(ANCHO_ETIQUETA, y, anchoActivos, GROSOR_BARRA, RADIO)} />
              )}
              <text className="valor-barra" x={ANCHO_ETIQUETA + anchoTotal + 10} y={centro} dominantBaseline="middle">
                {`${d.activos} de ${d.total}`}
              </text>
            </g>
          );
        })}
        {/* Linea base */}
        <line className="linea-base" x1={ANCHO_ETIQUETA} y1="0" x2={ANCHO_ETIQUETA} y2={alto} />
      </svg>

      <details className="grafico-tabla">
        <summary>Ver como tabla</summary>
        <table>
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Activos</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.sucursal}>
                <td>{d.sucursal}</td>
                <td>{d.activos}</td>
                <td>{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
};

const Kpi = ({ titulo, valor, detalle }) => (
  <div className="kpi-card">
    <h3>{titulo}</h3>
    <p className="kpi-valor">{valor}</p>
    <p className="kpi-detalle">{detalle}</p>
  </div>
);

const Metricas = () => {
  const { admin } = useAutorizaciones();
  const esGerencia = admin?.sector?.trim() === "Gerencia";

  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(esGerencia);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!esGerencia) return;
    const controller = new AbortController();

    metricasService
      .obtenerResumen(controller.signal)
      .then((respuesta) => {
        if (esResumenValido(respuesta)) setDatos(respuesta);
        else setError(true);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [esGerencia]);

  if (!esGerencia) {
    return (
      <div className="metricas-container">
        <h1>Métricas</h1>
        <p className="sin-permiso">Solo el sector Gerencia puede ver las métricas.</p>
      </div>
    );
  }

  if (loading) {
    return <h2>Cargando métricas...</h2>;
  }

  if (error) {
    return (
      <div className="metricas-container">
        <h1>Métricas</h1>
        <p className="metricas-estado">
          Métricas no disponibles (requieren el backend propio).
        </p>
      </div>
    );
  }

  const {
    clientesActivos,
    tasaRetencionMensual: retencion,
    clientesRecuperados,
    vendedoresActivosSemana,
    documentosPorVencer,
  } = datos;

  const detalleRetencion =
    retencion.tasa === null
      ? `Nadie compró en ${nombreDelMes(retencion.mesAnterior)}: todavía no hay base para calcularla.`
      : `${retencion.retenidos} de ${retencion.clientesMesAnterior} clientes que compraron en ${nombreDelMes(retencion.mesAnterior)} volvieron a comprar en ${nombreDelMes(retencion.mesActual)}.`;

  return (
    <div className="metricas-container">
      <h1>Métricas</h1>
      <p className="metricas-intro">
        Lo que una planilla y un grupo de WhatsApp no te muestran.
      </p>

      <div className="kpi-grid">
        <Kpi
          titulo="Clientes activos"
          valor={clientesActivos.total}
          detalle="Compraron en los últimos 30 días."
        />
        <Kpi
          titulo="Retención mensual"
          valor={porcentaje(retencion.tasa)}
          detalle={detalleRetencion}
        />
        <Kpi
          titulo="Clientes recuperados"
          valor={clientesRecuperados}
          detalle="Hace 30 días estaban en riesgo o inactivos y hoy están activos."
        />
        <Kpi
          titulo="Vendedores activos"
          valor={vendedoresActivosSemana.cantidad}
          detalle={`Con al menos una visita esta semana (${vendedoresActivosSemana.semana}).`}
        />
        <Kpi
          titulo="Documentos por vencer"
          valor={documentosPorVencer.cantidad}
          detalle={`Vencen en los próximos ${documentosPorVencer.dias} días.`}
        />
      </div>

      <section className="metricas-sucursales">
        <h2>Clientes activos por sucursal</h2>
        <GraficoSucursales datos={clientesActivos.porSucursal} />
      </section>
    </div>
  );
};

export default Metricas;
