import "../css/listaclientes.css"
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Offcanvas, Modal, Button, Alert, Spinner } from "react-bootstrap";
import FormCliente from "../components/FormCliente";
import RegistrarVisita from "../components/RegistrarVisita";
// COMMIT: "refactor: extraer la carga de clientes a un hook useClientes"
// (antes: este import no existia, tampoco useEffect en este archivo)
import useClientes from "../hooks/useClientes";
import useAutorizaciones from "../hooks/useAutorizaciones";
import clientesService from "../services/clientesService";
import { ESTADOS_DOCUMENTALES } from "../utils/estadoDocumental";

// Mismos valores que el enum de server/models/Cliente.js
const SUCURSALES = ["Casa Central", "Sucursal Norte", "Sucursal Sur"];

// Filtro de estado: el estado documental que calcula el backend
// (virtual estadoDocumental de server/models/Cliente.js).
const ESTADOS = Object.entries(ESTADOS_DOCUMENTALES).map(([valor, { corto }]) => ({
  valor,
  texto: corto,
}));

const FILAS_SKELETON = 6;

// COMMIT: "fix: usar optional chaining en el filtro y la tabla de clientes"
// (antes: cliente.name.firstname / cliente.name.lastname sin ?.)
// FakeStoreAPI y los altas del formulario usan "-" como apellido vacio.
const partesDelNombre = (cliente) =>
  [cliente?.name?.firstname, cliente?.name?.lastname].filter(
    (parte) => parte && parte !== "-"
  );

const nombreCompleto = (cliente) =>
  partesDelNombre(cliente).join(" ") || "Cliente sin nombre";

const iniciales = (cliente) =>
  partesDelNombre(cliente)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("") || "?";

// Grupo de chips de un solo valor ("" = todos).
const Chips = ({ etiqueta, opciones, valor, onCambiar, textoTodos }) => (
  <div className="chips" role="group" aria-label={etiqueta}>
    <span className="chips-etiqueta" aria-hidden="true">{etiqueta}</span>
    {[{ valor: "", texto: textoTodos }, ...opciones].map((opcion) => (
      <button
        key={opcion.valor || "todos"}
        type="button"
        className="chip"
        aria-pressed={valor === opcion.valor}
        onClick={() => onCambiar(opcion.valor)}
      >
        {opcion.texto}
      </button>
    ))}
  </div>
);

const BadgeEstado = ({ estado }) => {
  const info = ESTADOS_DOCUMENTALES[estado];
  if (!info) return <span className="badge-estado-cliente estado-sin-datos">Sin datos</span>;
  return (
    <span className={`badge-estado-cliente estado-${estado}`} title={info.etiqueta}>
      <span aria-hidden="true">{info.icono}</span> {info.corto}
    </span>
  );
};

const FilasSkeleton = () =>
  Array.from({ length: FILAS_SKELETON }, (_, i) => (
    <tr key={i} className="fila-skeleton" aria-hidden="true">
      <td><span className="skeleton skeleton-avatar" /><span className="skeleton skeleton-texto" /></td>
      <td><span className="skeleton skeleton-texto" /></td>
      <td><span className="skeleton skeleton-texto" /></td>
      <td><span className="skeleton skeleton-texto" /></td>
      <td><span className="skeleton skeleton-badge" /></td>
      <td><span className="skeleton skeleton-boton" /></td>
    </tr>
  ));

const EstadoVacio = ({ hayFiltros, onLimpiar }) => (
  <div className="estado-vacio">
    <svg viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
      <rect x="14" y="14" width="72" height="62" rx="8" className="ilus-fondo" />
      <rect x="26" y="28" width="40" height="6" rx="3" className="ilus-linea" />
      <rect x="26" y="42" width="30" height="6" rx="3" className="ilus-linea" />
      <rect x="26" y="56" width="36" height="6" rx="3" className="ilus-linea" />
      <circle cx="80" cy="60" r="16" className="ilus-lupa" />
      <line x1="92" y1="72" x2="106" y2="86" className="ilus-mango" />
    </svg>
    <h2>No hay clientes que coincidan</h2>
    <p>Probá con otro apellido o ciudad, o cambiá los filtros.</p>
    {hayFiltros && (
      <button type="button" className="btn-secundario" onClick={onLimpiar}>
        Limpiar filtros
      </button>
    )}
  </div>
);

const ListaClientes = () => {
  // COMMIT: "refactor: extraer la carga de clientes a un hook useClientes"
  // (antes aca estaban useState de clientes/loading/error + el useEffect con
  // el fetch/axios y AbortController, y la funcion agregarCliente local;
  // todo eso se movio al hook, que sigue cancelando la request con
  // AbortController al desmontar o al reintentar. Ese fetch habia pasado
  // antes por los commits "fix: usar optional chaining..." (5),
  // "fix: refrescar la lista..." (6), "fix: cancelar peticiones fetch..." (7)
  // y "refactor: centralizar llamadas HTTP en clientesService" (11))
  const {
    clientes,
    loading,
    error,
    agregarCliente,
    actualizarCliente,
    quitarCliente,
    recargar,
  } = useClientes();
  const { admin } = useAutorizaciones();
  const esGerencia = admin?.sector?.trim() === "Gerencia";

  // El buscador global de la topbar llega como ?buscar=. Si cambia mientras
  // la página está abierta (nueva búsqueda desde la topbar), se actualiza el
  // filtro durante el render, sin un useEffect extra.
  const [searchParams] = useSearchParams();
  const buscarParam = searchParams.get("buscar") ?? "";
  const [busqueda, setBusqueda] = useState(buscarParam);
  const [ultimoBuscarParam, setUltimoBuscarParam] = useState(buscarParam);
  if (buscarParam !== ultimoBuscarParam) {
    setUltimoBuscarParam(buscarParam);
    setBusqueda(buscarParam);
  }
  const [sucursal, setSucursal] = useState("");
  const [estado, setEstado] = useState("");

  const [formAbierto, setFormAbierto] = useState(false);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  const hayFiltros = busqueda !== "" || sucursal !== "" || estado !== "";
  const limpiarFiltros = () => {
    setBusqueda("");
    setSucursal("");
    setEstado("");
  };

  // COMMIT: "fix: usar optional chaining en el filtro y la tabla de clientes"
  // (antes: cliente.name.lastname.toLowerCase()... sin los ?.)
  // Los filtros se aplican sobre la lista ya cargada (sin otra request),
  // asi funcionan igual con el backend propio y con FakeStoreAPI.
  const texto = busqueda.toLowerCase();
  const clientesFiltrados = clientes.filter(
    (cliente) =>
      (sucursal === "" || cliente?.sucursal === sucursal) &&
      (estado === "" || cliente?.estadoDocumental === estado) &&
      (cliente.name?.lastname?.toLowerCase().includes(texto) ||
        cliente.address?.city?.toLowerCase().includes(texto))
  );

  const cerrarModalEliminar = () => {
    if (eliminando) return;
    setAEliminar(null);
    setErrorEliminar("");
  };

  const confirmarEliminar = async () => {
    setEliminando(true);
    setErrorEliminar("");
    try {
      await clientesService.eliminarCliente(aEliminar.id);
      quitarCliente(aEliminar.id);
      setAEliminar(null);
    } catch (err) {
      setErrorEliminar(
        err.response?.data?.error ?? "No se pudo eliminar el cliente. Intente nuevamente."
      );
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="clientes">
      <header className="clientes-encabezado">
        <div>
          <h1>Clientes</h1>
          <p className="clientes-cantidad" aria-live="polite">
            {loading
              ? "Cargando clientes..."
              : error
                ? "—"
                : `${clientesFiltrados.length} de ${clientes.length} clientes`}
          </p>
        </div>
        <button
          type="button"
          className="btn-primario"
          onClick={() => setFormAbierto(true)}
        >
          <span aria-hidden="true">+</span> Nuevo cliente
        </button>
      </header>

      <div className="clientes-toolbar">
        <div className="buscador-con-icono">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <line x1="12.6" y1="12.6" x2="17" y2="17" />
          </svg>
          <input
            type="search"
            aria-label="Buscar clientes por apellido o ciudad"
            placeholder="Buscar por apellido o ciudad"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="clientes-filtros">
          <Chips
            etiqueta="Sucursal"
            textoTodos="Todas"
            opciones={SUCURSALES.map((nombre) => ({ valor: nombre, texto: nombre }))}
            valor={sucursal}
            onCambiar={setSucursal}
          />
          <Chips
            etiqueta="Estado"
            textoTodos="Todos"
            opciones={ESTADOS}
            valor={estado}
            onCambiar={setEstado}
          />
        </div>
      </div>

      {error ? (
        <div className="estado-error" role="alert">
          <p>
            <strong>No se pudieron cargar los clientes.</strong> Revisá tu
            conexión o que el servidor esté disponible.
          </p>
          <button type="button" className="btn-secundario" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : !loading && clientesFiltrados.length === 0 ? (
        <EstadoVacio hayFiltros={hayFiltros} onLimpiar={limpiarFiltros} />
      ) : (
        <div className="tabla-clientes-wrapper" aria-busy={loading}>
          <table className="tabla-clientes">
            <caption className="visually-hidden">
              Lista de clientes: nombre, ciudad, sucursal, teléfono, estado
              documental y acciones disponibles.
            </caption>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Ciudad</th>
                <th scope="col">Sucursal</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <FilasSkeleton />
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td data-label="Nombre" className="celda-nombre">
                      <span className="avatar" aria-hidden="true">{iniciales(cliente)}</span>
                      <span className="nombre-texto">{nombreCompleto(cliente)}</span>
                    </td>
                    <td data-label="Ciudad">{cliente.address?.city ?? "—"}</td>
                    <td data-label="Sucursal">{cliente?.sucursal ?? "—"}</td>
                    <td data-label="Teléfono">{cliente?.phone ?? "—"}</td>
                    <td data-label="Estado">
                      <BadgeEstado estado={cliente?.estadoDocumental} />
                    </td>
                    <td className="celda-acciones">
                      <Link
                        className="btn-accion"
                        to={`/clientes/${cliente.id}`}
                        aria-label={`Ver ${nombreCompleto(cliente)}`}
                      >
                        Ver
                      </Link>
                      <RegistrarVisita
                        cliente={cliente}
                        className="btn-accion-visita"
                        onRegistrada={({ cliente: actualizado }) => actualizarCliente(actualizado)}
                      />
                      {esGerencia && (
                        <button
                          type="button"
                          className="btn-accion btn-accion-peligro"
                          aria-label={`Eliminar ${nombreCompleto(cliente)}`}
                          onClick={() => setAEliminar(cliente)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Offcanvas
        show={formAbierto}
        onHide={() => setFormAbierto(false)}
        placement="end"
        className="offcanvas-cliente"
        aria-labelledby="titulo-nuevo-cliente"
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar">
          <Offcanvas.Title id="titulo-nuevo-cliente">Nuevo cliente</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {/* COMMIT: "fix: refrescar la lista de clientes al crear uno nuevo" */}
          {/* (antes: <FormCliente /> sin el prop onClienteCreado) */}
          <FormCliente onClienteCreado={agregarCliente} />
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={aEliminar !== null} onHide={cerrarModalEliminar} centered>
        <Modal.Header closeButton={!eliminando}>
          <Modal.Title>Eliminar cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            ¿Seguro que querés eliminar a <strong>{nombreCompleto(aEliminar)}</strong>?
            Esta acción no se puede deshacer.
          </p>
          {errorEliminar && (
            <Alert variant="danger" className="mt-3 mb-0">{errorEliminar}</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModalEliminar} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmarEliminar} disabled={eliminando}>
            {eliminando ? <><Spinner size="sm" /> Eliminando...</> : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ListaClientes;