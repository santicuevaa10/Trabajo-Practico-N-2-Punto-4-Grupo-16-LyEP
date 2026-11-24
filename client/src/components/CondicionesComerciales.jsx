import "../css/condicionescomerciales.css";
import { useEffect, useState } from "react";
import clientesService from "../services/clientesService";
import {
  formatearFecha,
  fechaInputAInicioDelDiaISO,
  hoyParaInput,
} from "../utils/fechas";

const formatearMoneda = (valor) =>
  Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

// Mismo orden que devuelve el backend: vigenteDesde desc, y a igual fecha
// el registro cargado mas recientemente primero.
const ordenarHistorial = (lista) =>
  [...lista].sort(
    (a, b) =>
      new Date(b.vigenteDesde) - new Date(a.vigenteDesde) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  );

const condicionVacia = () => ({
  descuento: "",
  limiteCredito: "",
  motivo: "",
  vigenteDesde: hoyParaInput(),
});

// Historial append-only de descuento y limite de credito del cliente.
// Gerencia puede registrar condiciones nuevas; el resto lo ve en modo lectura.
const CondicionesComerciales = ({ idCliente, esGerencia, usuario }) => {
  const [historial, setHistorial] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [nueva, setNueva] = useState(condicionVacia);
  const [errorAlta, setErrorAlta] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    clientesService
      .obtenerCondiciones(idCliente, controller.signal)
      .then((data) => setHistorial(ordenarHistorial(data)))
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setErrorCarga(true);
      });

    return () => controller.abort();
  }, [idCliente]);

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setNueva((previa) => ({ ...previa, [name]: value }));
  };

  const registrarCondicion = async (e) => {
    e.preventDefault();
    const descuento = Number(nueva.descuento);
    const limiteCredito = Number(nueva.limiteCredito);

    if (nueva.descuento === "" || descuento < 0 || descuento > 100) {
      setErrorAlta("El descuento debe estar entre 0 y 100");
      return;
    }
    if (nueva.limiteCredito === "" || limiteCredito < 0) {
      setErrorAlta("El límite de crédito debe ser mayor o igual a 0");
      return;
    }
    if (!nueva.motivo.trim()) {
      setErrorAlta("Indicá el motivo del cambio");
      return;
    }

    setErrorAlta("");
    setGuardando(true);
    try {
      const creada = await clientesService.crearCondicion(
        idCliente,
        {
          descuento,
          limiteCredito,
          motivo: nueva.motivo.trim(),
          vigenteDesde: fechaInputAInicioDelDiaISO(nueva.vigenteDesde),
        },
        usuario
      );
      setHistorial((previo) => ordenarHistorial([creada, ...(previo ?? [])]));
      setNueva(condicionVacia());
    } catch (err) {
      setErrorAlta(
        err.response?.data?.error || "No se pudo registrar la condición"
      );
    } finally {
      setGuardando(false);
    }
  };

  if (errorCarga) {
    return <p className="error-condicion">No se pudo cargar el historial de condiciones comerciales.</p>;
  }

  if (!historial) {
    return <p>Cargando condiciones comerciales...</p>;
  }

  const ahora = new Date();
  const vigente = historial.find((c) => new Date(c.vigenteDesde) <= ahora);

  const estadoDe = (condicion) => {
    if (condicion === vigente) return "vigente";
    if (new Date(condicion.vigenteDesde) > ahora) return "programada";
    return "reemplazada";
  };

  return (
    <div className="condiciones-comerciales">
      {vigente ? (
        <div className="condicion-vigente">
          <span className="condicion-vigente-titulo">Condición vigente</span>
          <div className="condicion-vigente-valores">
            <div>
              <span className="valor">{vigente.descuento}%</span>
              <span className="rotulo">Descuento</span>
            </div>
            <div>
              <span className="valor">{formatearMoneda(vigente.limiteCredito)}</span>
              <span className="rotulo">Límite de crédito</span>
            </div>
          </div>
          <p className="condicion-vigente-detalle">
            Desde el {formatearFecha(vigente.vigenteDesde)} · Autorizó{" "}
            <strong>{vigente.autorizadoPor}</strong>
          </p>
        </div>
      ) : (
        <p className="sin-condicion">
          El cliente no tiene una condición comercial vigente.
        </p>
      )}

      {!esGerencia && (
        <p className="modo-lectura">
          Modo lectura: solo Gerencia puede registrar condiciones nuevas.
        </p>
      )}

      {esGerencia && (
        <form className="form-condicion" onSubmit={registrarCondicion}>
          <h3>Registrar nueva condición</h3>
          <p className="aviso-append-only">
            Las condiciones no se editan ni se borran: cada cambio queda en el
            historial a tu nombre ({usuario}).
          </p>

          <div className="form-condicion-fila">
            <label>
              Descuento (%)
              <input
                type="number"
                name="descuento"
                min="0"
                max="100"
                step="0.01"
                value={nueva.descuento}
                onChange={cambiarCampo}
                required
              />
            </label>

            <label>
              Límite de crédito ($)
              <input
                type="number"
                name="limiteCredito"
                min="0"
                step="0.01"
                value={nueva.limiteCredito}
                onChange={cambiarCampo}
                required
              />
            </label>

            <label>
              Vigente desde
              <input
                type="date"
                name="vigenteDesde"
                value={nueva.vigenteDesde}
                onChange={cambiarCampo}
                required
              />
            </label>
          </div>

          <label>
            Motivo
            <textarea
              name="motivo"
              rows={2}
              value={nueva.motivo}
              onChange={cambiarCampo}
              required
            />
          </label>

          {errorAlta && <p className="error-condicion">{errorAlta}</p>}

          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar condición"}
          </button>
        </form>
      )}

      <h3 className="titulo-historial">Historial</h3>

      {historial.length === 0 ? (
        <p>Todavía no se registraron condiciones comerciales.</p>
      ) : (
        <ol className="linea-tiempo">
          {historial.map((condicion) => {
            const estado = estadoDe(condicion);
            return (
              <li key={condicion.id} className={`hito hito-${estado}`}>
                <div className="hito-encabezado">
                  <strong>{formatearFecha(condicion.vigenteDesde)}</strong>
                  <span className={`etiqueta-estado etiqueta-${estado}`}>
                    {estado === "vigente" && "Vigente"}
                    {estado === "programada" && "Programada"}
                    {estado === "reemplazada" && "Reemplazada"}
                  </span>
                </div>
                <p>
                  Descuento <strong>{condicion.descuento}%</strong> · Límite{" "}
                  <strong>{formatearMoneda(condicion.limiteCredito)}</strong>
                </p>
                {condicion.motivo && <p className="hito-motivo">“{condicion.motivo}”</p>}
                <small>
                  Autorizó {condicion.autorizadoPor} · cargado el{" "}
                  {formatearFechaHora(condicion.createdAt)}
                </small>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default CondicionesComerciales;
