import "../css/importar.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAutorizaciones from "../hooks/useAutorizaciones";
import importacionesService from "../services/importacionesService";

const TAMANIO_MAXIMO = 2 * 1024 * 1024; // mismo limite que el backend

const ACCIONES = {
  crear: { etiqueta: "Se crea", clase: "accion-crear" },
  actualizar: { etiqueta: "Se actualiza", clase: "accion-actualizar" },
  sin_cambios: { etiqueta: "Sin cambios", clase: "accion-sin-cambios" },
  error: { etiqueta: "Error", clase: "accion-error" },
};

const NOMBRES_CAMPOS = {
  email: "Email",
  phone: "Teléfono",
  sucursal: "Sucursal",
  "name.firstname": "Razón social",
  "name.lastname": "Nombre de fantasía",
  "address.street": "Calle",
  "address.number": "Número",
  "address.zipcode": "Código postal",
  "address.city": "Ciudad",
};

const mensajeDeError = (err) =>
  err.response?.data?.error || "No se pudo procesar el archivo. Probá de nuevo.";

const Resumen = ({ resultado, enFuturo }) => (
  <div className="resumen-importacion">
    <div className="tarjeta-resumen accion-crear">
      <span className="numero">{resultado.creados}</span>
      {enFuturo ? "a crear" : "creados"}
    </div>
    <div className="tarjeta-resumen accion-actualizar">
      <span className="numero">{resultado.actualizados}</span>
      {enFuturo ? "a actualizar" : "actualizados"}
    </div>
    <div className="tarjeta-resumen accion-sin-cambios">
      <span className="numero">{resultado.sinCambios ?? 0}</span>
      sin cambios
    </div>
    <div className="tarjeta-resumen accion-error">
      <span className="numero">{resultado.errores.length}</span>
      con errores
    </div>
  </div>
);

const TablaDetalle = ({ detalle }) => (
  <div className="tabla-importacion-wrapper">
    <table className="tabla-importacion">
      <thead>
        <tr>
          <th>Fila</th>
          <th>Email</th>
          <th>Razón social</th>
          <th>Acción</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        {detalle.map((item) => (
          <tr key={item.fila} className={item.accion === "error" ? "fila-con-error" : ""}>
            <td>{item.fila}</td>
            <td>{item.email || "-"}</td>
            <td>{item.nombre || "-"}</td>
            <td>
              <span className={`badge-accion ${ACCIONES[item.accion].clase}`}>
                {ACCIONES[item.accion].etiqueta}
              </span>
            </td>
            <td>
              {item.motivo ??
                (item.cambios?.length
                  ? `Cambia: ${item.cambios.map((c) => NOMBRES_CAMPOS[c] ?? c).join(", ")}`
                  : "")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Importacion de clientes desde el CSV exportado del ERP (Tango).
// Flujo: elegir archivo -> simulacion automatica -> revisar -> confirmar.
const Importar = () => {
  const { admin } = useAutorizaciones();
  const esGerencia = admin?.sector?.trim() === "Gerencia";

  const [archivo, setArchivo] = useState(null);
  const [simulacion, setSimulacion] = useState(null);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  if (!esGerencia) {
    return (
      <div className="importar-container">
        <h1>Importar clientes</h1>
        <p className="sin-permiso">Solo el sector Gerencia puede importar clientes.</p>
      </div>
    );
  }

  const elegirArchivo = async (e) => {
    const elegido = e.target.files?.[0];
    setSimulacion(null);
    setResultadoFinal(null);
    setError("");
    setArchivo(elegido ?? null);
    if (!elegido) return;

    if (!/\.csv$/i.test(elegido.name)) {
      setError("El archivo tiene que ser un .csv");
      return;
    }
    if (elegido.size > TAMANIO_MAXIMO) {
      setError("El archivo supera el máximo de 2 MB");
      return;
    }

    setProcesando(true);
    try {
      setSimulacion(await importacionesService.importarClientes(elegido, { simulacion: true }));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    setProcesando(true);
    setError("");
    try {
      setResultadoFinal(await importacionesService.importarClientes(archivo, { simulacion: false }));
      setSimulacion(null);
      setArchivo(null);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const hayCambios = simulacion && simulacion.creados + simulacion.actualizados > 0;

  return (
    <div className="importar-container">
      <h1>Importar clientes</h1>

      <p className="ayuda-importar">
        Subí el CSV de clientes exportado del ERP (máximo 2 MB). Primero vas a ver
        una simulación de lo que se va a crear y actualizar; no se guarda nada
        hasta que confirmes. Los clientes se identifican por email: si ya existe,
        se actualiza; si no, se crea.
      </p>

      <label className="selector-archivo">
        <span>{archivo ? archivo.name : "Elegir archivo CSV"}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={elegirArchivo}
          disabled={procesando}
          // Permite volver a elegir el mismo archivo despues de confirmar
          key={resultadoFinal ? "final" : "inicial"}
        />
      </label>

      {procesando && <p className="procesando">Procesando archivo...</p>}
      {error && <p className="error-importar">{error}</p>}

      {simulacion && (
        <section className="bloque-importacion">
          <h2>Simulación</h2>

          {simulacion.columnasFaltantes?.length > 0 && (
            <p className="aviso-columnas">
              El archivo no tiene estas columnas del mapeo, así que esos datos no se
              importan: {simulacion.columnasFaltantes.join(", ")}
            </p>
          )}

          <Resumen resultado={simulacion} enFuturo />
          <TablaDetalle detalle={simulacion.detalle} />

          <div className="acciones-importar">
            <button
              type="button"
              className="btn-confirmar-importacion"
              onClick={confirmar}
              disabled={procesando || !hayCambios}
            >
              Confirmar importación
            </button>
            {!hayCambios && (
              <span>No hay filas para crear ni actualizar.</span>
            )}
            {hayCambios && simulacion.errores.length > 0 && (
              <span>Las filas con error se van a saltear.</span>
            )}
          </div>
        </section>
      )}

      {resultadoFinal && (
        <section className="bloque-importacion">
          <h2>Importación realizada</h2>
          <Resumen resultado={resultadoFinal} />
          {resultadoFinal.errores.length > 0 && <TablaDetalle detalle={resultadoFinal.detalle.filter((d) => d.accion === "error")} />}
          <Link className="btn-ver-clientes" to="/clientes">
            Ver clientes
          </Link>
        </section>
      )}
    </div>
  );
};

export default Importar;
