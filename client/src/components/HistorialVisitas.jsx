import { useEffect, useState } from "react";
import clientesService from "../services/clientesService";
import { RESULTADOS_VISITA } from "../utils/visitas";
import { formatearFecha } from "../utils/fechas";

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

// Pestaña "Visitas" de la ficha: ultima visita / ultima compra y las
// ultimas 20 visitas registradas.
const HistorialVisitas = ({ cliente }) => {
  const [visitas, setVisitas] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);

  // Se recarga cuando cambia ultimaVisita (o sea, al registrar una nueva).
  useEffect(() => {
    const controller = new AbortController();

    clientesService
      .obtenerVisitas(cliente.id, controller.signal)
      .then((data) => setVisitas(data))
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setErrorCarga(true);
      });

    return () => controller.abort();
  }, [cliente.id, cliente.ultimaVisita]);

  return (
    <div className="historial-visitas">
      <p>
        <strong>Última visita:</strong>{" "}
        {cliente.ultimaVisita ? formatearFecha(cliente.ultimaVisita) : "Sin visitas registradas"}
      </p>
      <p>
        <strong>Última compra:</strong>{" "}
        {cliente.ultimaCompra ? formatearFecha(cliente.ultimaCompra) : "Sin compras registradas"}
      </p>

      <h3 className="titulo-historial">Últimas visitas</h3>

      {errorCarga && <p>No se pudo cargar el historial de visitas.</p>}
      {!errorCarga && !visitas && <p>Cargando visitas...</p>}
      {visitas?.length === 0 && <p>Todavía no se registraron visitas.</p>}

      {visitas?.length > 0 && (
        <ul className="lista-visitas">
          {visitas.map((visita) => {
            const resultado = RESULTADOS_VISITA[visita.resultado];
            return (
              <li key={visita.id} className={`visita visita-${visita.resultado}`}>
                <div>
                  <span aria-hidden="true">{resultado?.icono}</span>{" "}
                  <strong>{resultado?.etiqueta ?? visita.resultado}</strong>
                  {" · "}
                  {formatearFechaHora(visita.fecha)}
                </div>
                {visita.nota && <p className="visita-nota">{visita.nota}</p>}
                <small>Vendedor: {visita.vendedor}</small>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HistorialVisitas;
