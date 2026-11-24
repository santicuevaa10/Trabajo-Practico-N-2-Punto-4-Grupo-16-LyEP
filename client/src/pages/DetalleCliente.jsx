import '../css/detallecliente.css'
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Modal, Button, Tabs, Tab, Badge, Alert, Spinner } from "react-bootstrap";
import useAutorizaciones from "../hooks/useAutorizaciones";
import clientesService from '../services/clientesService';
import FormCliente from "../components/FormCliente";
import CondicionesComerciales from "../components/CondicionesComerciales";
import RegistrarVisita from "../components/RegistrarVisita";
import HistorialVisitas from "../components/HistorialVisitas";
import {
  TIPOS_DOCUMENTO,
  ESTADOS_DOCUMENTALES,
  estadoDeVencimiento,
} from "../utils/estadoDocumental";
import { formatearFecha, fechaInputAISO } from "../utils/fechas";

const DOCUMENTO_VACIO = {
  tipo: "habilitacion",
  numero: "",
  vencimiento: "",
  observaciones: "",
};

// --- Helpers de presentacion (no cambian datos, solo como se muestran) ---

// Variante de Badge por estado documental. "warning" lleva texto oscuro
// para cumplir contraste AA sobre amarillo.
const BADGE_DOCUMENTAL = {
  ok: { bg: "success" },
  por_vencer: { bg: "warning", text: "dark" },
  vencido: { bg: "danger" },
};

// Iniciales para el avatar: primera letra de nombre y apellido. El backend
// usa "-" como apellido por defecto, por eso se ignoran los no alfabeticos.
const iniciales = (nombre = {}) =>
  [nombre.firstname, nombre.lastname]
    .map((parte) => (parte ?? "").trim().charAt(0))
    .filter((letra) => /\p{L}/u.test(letra))
    .join("")
    .toUpperCase() || "?";

const valorOGuion = (valor) =>
  valor === undefined || valor === null || String(valor).trim() === "" || valor === "-"
    ? "—"
    : valor;

// Grilla de dos columnas: etiqueta gris arriba, valor abajo.
const GrillaDatos = ({ titulo, campos }) => (
  <section className="seccion-datos" aria-labelledby={`titulo-${titulo}`}>
    <h2 id={`titulo-${titulo}`} className="seccion-datos-titulo">{titulo}</h2>
    <dl className="grilla-datos">
      {campos.map(({ etiqueta, valor }) => (
        <div className="dato" key={etiqueta}>
          <dt className="dato-etiqueta">{etiqueta}</dt>
          <dd className="dato-valor">{valorOGuion(valor)}</dd>
        </div>
      ))}
    </dl>
  </section>
);

// Estado vacio reutilizable (sin datos / funcionalidad proxima).
const EstadoVacio = ({ titulo, children, icono = "🗂" }) => (
  <div className="estado-vacio">
    <span className="estado-vacio-icono" aria-hidden="true">{icono}</span>
    <p className="estado-vacio-titulo">{titulo}</p>
    {children && <p className="estado-vacio-texto">{children}</p>}
  </div>
);

const DetalleCliente = () => {
 const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAutorizaciones();
  const role = admin?.sector;
  const esGerencia = role?.trim() === "Gerencia";

  const [cliente, setCliente] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [nuevoDocumento, setNuevoDocumento] = useState(DOCUMENTO_VACIO);
  const [errorDocumento, setErrorDocumento] = useState("");
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pestana, setPestana] = useState("datos");

  const manejarClienteActualizado = (clienteActualizado) => {
    setCliente(clienteActualizado);
    setEditando(false);
    setMensaje("Cliente actualizado correctamente");
  };

  useEffect(() => {
    const controller = new AbortController();

    clientesService
      .obtenerClientePorId(id, controller.signal)
      .then((data) => setCliente(data))
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setErrorCarga(true);
      });

    return () => controller.abort();
  }, [id]);

  const eliminarCliente = async () => {
    try {
      await clientesService.eliminarCliente(id);

      setMensaje("Cliente eliminado correctamente");

      setTimeout(() => {
        navigate("/clientes");
      }, 2000);

    } catch {
      setMensaje("Error al eliminar cliente");
    }
  };

  const confirmarEliminar = async () => {
    setMostrarConfirmacion(false);
    await eliminarCliente();
  };

  const cambiarCampoDocumento = (e) => {
    const { name, value } = e.target;
    setNuevoDocumento((previo) => ({ ...previo, [name]: value }));
  };

  const agregarDocumento = async (e) => {
    e.preventDefault();
    if (!nuevoDocumento.vencimiento) {
      setErrorDocumento("La fecha de vencimiento es obligatoria");
      return;
    }
    setErrorDocumento("");
    setGuardandoDocumento(true);
    try {
      const actualizado = await clientesService.agregarDocumento(id, {
        ...nuevoDocumento,
        vencimiento: fechaInputAISO(nuevoDocumento.vencimiento),
      });
      setCliente(actualizado);
      setNuevoDocumento(DOCUMENTO_VACIO);
    } catch (err) {
      setErrorDocumento(
        err.response?.data?.error || "No se pudo agregar el documento"
      );
    } finally {
      setGuardandoDocumento(false);
    }
  };

  const eliminarDocumento = async (idDocumento) => {
    setErrorDocumento("");
    try {
      const actualizado = await clientesService.eliminarDocumento(id, idDocumento);
      setCliente(actualizado);
    } catch (err) {
      setErrorDocumento(
        err.response?.data?.error || "No se pudo eliminar el documento"
      );
    }
  };

  const empezarEdicion = () => {
    setMensaje("");
    setEditando(true);
    setPestana("datos");
  };

  if(errorCarga){
    return (
      <div className="detalle-cliente detalle-estado">
        <Alert variant="danger" className="mb-4">
          <Alert.Heading as="h2" className="h5">
            No se pudo cargar la información del cliente
          </Alert.Heading>
          <p className="mb-0">
            Error al cargar el cliente. Revisá tu conexión e intentá de nuevo en unos minutos.
          </p>
        </Alert>
        <Button variant="outline-secondary" onClick={() => navigate("/clientes")}>
          ← Volver a clientes
        </Button>
      </div>
    );
  }


  if (!cliente) {
    return (
      <div className="detalle-cliente detalle-estado" role="status" aria-live="polite">
        <Spinner animation="border" className="detalle-spinner" aria-hidden="true" />
        <p className="detalle-cargando">Cargando cliente…</p>
      </div>
    );
  }

  const nombreCompleto = [cliente.name?.firstname, cliente.name?.lastname]
    .filter((parte) => parte && parte !== "-")
    .join(" ");

  // Mismo criterio que el banner: documentacion vencida => no habilitado.
  const estadoDocumental = cliente.estadoDocumental;
  const infoDocumental = ESTADOS_DOCUMENTALES[estadoDocumental];
  const habilitado = estadoDocumental !== "vencido";
  const documentos = cliente.documentos ?? [];

  return (
    <div className="detalle-cliente">
      <Button
        variant="link"
        className="volver-clientes"
        onClick={() => navigate("/clientes")}
      >
        ← Clientes
      </Button>

      <header className="ficha-encabezado">
        <div className="ficha-identidad">
          <div className="avatar-cliente" aria-hidden="true">
            {iniciales(cliente.name)}
          </div>

          <div className="ficha-titulos">
            <h1 className="ficha-nombre">{nombreCompleto || "Cliente sin nombre"}</h1>
            <p className="ficha-subtitulo">
              <span>{cliente.email}</span>
              {cliente.sucursal && (
                <>
                  <span className="separador" aria-hidden="true">·</span>
                  <span>{cliente.sucursal}</span>
                </>
              )}
            </p>

            <div className="ficha-badges">
              <Badge bg={habilitado ? "success" : "danger"} className="badge-estado">
                {habilitado ? "Habilitado para venta" : "No habilitado para venta"}
              </Badge>
              {infoDocumental && (
                <Badge
                  {...BADGE_DOCUMENTAL[estadoDocumental]}
                  className="badge-estado"
                >
                  <span aria-hidden="true">{infoDocumental.icono}</span>{" "}
                  {infoDocumental.etiqueta}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="ficha-acciones">
          <Button variant="primary" className="btn-ficha" onClick={empezarEdicion}>
            Editar
          </Button>
          <RegistrarVisita
            cliente={cliente}
            className="btn-ficha"
            onRegistrada={({ cliente: actualizado }) => setCliente(actualizado)}
          />
          {esGerencia && (
            <Button
              variant="outline-danger"
              className="btn-ficha"
              onClick={() => setMostrarConfirmacion(true)}
            >
              Eliminar
            </Button>
          )}
        </div>
        {role && <p className="ficha-rol">Viendo como: {role}</p>}
      </header>

      {cliente.estadoDocumental === "vencido" && (
        <div className="banner-doc-vencida" role="alert">
          Cliente con documentación vencida: no habilitado para venta
        </div>
      )}

      {mensaje && (
        <p className="mensaje-eliminado" role="status">
          {mensaje}
        </p>
      )}

      <Tabs
        activeKey={pestana}
        onSelect={(clave) => clave && setPestana(clave)}
        mountOnEnter
        className="pestanas-cliente"
      >
        <Tab eventKey="datos" title="Datos generales">
          {editando ? (
            <FormCliente
              clienteInicial={cliente}
              onClienteActualizado={manejarClienteActualizado}
              onCancelar={() => setEditando(false)}
            />
          ) : (
            <>
              <GrillaDatos
                titulo="Contacto"
                campos={[
                  { etiqueta: "Nombre", valor: cliente.name?.firstname },
                  { etiqueta: "Apellido", valor: cliente.name?.lastname },
                  { etiqueta: "Email", valor: cliente.email },
                  { etiqueta: "Teléfono", valor: cliente.phone },
                ]}
              />
              <GrillaDatos
                titulo="Dirección"
                campos={[
                  { etiqueta: "Calle", valor: cliente.address?.street },
                  { etiqueta: "Número", valor: cliente.address?.number },
                  { etiqueta: "Código postal", valor: cliente.address?.zipcode },
                  { etiqueta: "Ciudad", valor: cliente.address?.city },
                ]}
              />
              {/* La contraseña nunca se muestra, aunque viniera en la respuesta. */}
              <GrillaDatos
                titulo="Cuenta"
                campos={[
                  { etiqueta: "Usuario", valor: cliente.username },
                  { etiqueta: "Sucursal", valor: cliente.sucursal },
                  { etiqueta: "ID de cliente", valor: cliente.id },
                ]}
              />
            </>
          )}
        </Tab>

        <Tab eventKey="documentacion" title="Documentación">
          {documentos.length === 0 ? (
            <EstadoVacio titulo="Sin documentos cargados" icono="📄">
              {esGerencia
                ? "Agregá la habilitación, el director técnico o la constancia AFIP con el formulario de abajo."
                : "Gerencia todavía no cargó documentación para este cliente."}
            </EstadoVacio>
          ) : (
            <ul className="lista-documentos">
              {documentos.map((doc) => {
                const estado = estadoDeVencimiento(doc.vencimiento);
                return (
                  <li key={doc.id} className={`documento documento-${estado}`}>
                    <div>
                      <strong>{TIPOS_DOCUMENTO[doc.tipo] ?? doc.tipo}</strong>
                      {doc.numero && <> · N° {doc.numero}</>}
                      <br />
                      <span className="documento-vencimiento">
                        Vence: {formatearFecha(doc.vencimiento)} ·{" "}
                        {ESTADOS_DOCUMENTALES[estado].corto}
                      </span>
                      {doc.observaciones && (
                        <>
                          <br />
                          <small>{doc.observaciones}</small>
                        </>
                      )}
                    </div>
                    {esGerencia && (
                      <button
                        type="button"
                        className="btn-quitar-documento"
                        onClick={() => eliminarDocumento(doc.id)}
                      >
                        Quitar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {errorDocumento && <p className="error-documento" role="alert">{errorDocumento}</p>}

          {esGerencia && (
            <form className="form-documento" onSubmit={agregarDocumento}>
              <h3>Agregar documento</h3>

              <label>
                Tipo
                <select
                  name="tipo"
                  value={nuevoDocumento.tipo}
                  onChange={cambiarCampoDocumento}
                >
                  {Object.entries(TIPOS_DOCUMENTO).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Número
                <input
                  name="numero"
                  value={nuevoDocumento.numero}
                  onChange={cambiarCampoDocumento}
                />
              </label>

              <label>
                Vencimiento
                <input
                  type="date"
                  name="vencimiento"
                  value={nuevoDocumento.vencimiento}
                  onChange={cambiarCampoDocumento}
                  required
                />
              </label>

              <label className="campo-ancho">
                Observaciones
                <textarea
                  name="observaciones"
                  value={nuevoDocumento.observaciones}
                  onChange={cambiarCampoDocumento}
                  rows={2}
                />
              </label>

              <button type="submit" disabled={guardandoDocumento}>
                {guardandoDocumento ? "Guardando..." : "Agregar documento"}
              </button>
            </form>
          )}
        </Tab>

        <Tab eventKey="condiciones" title="Condiciones comerciales">
          <CondicionesComerciales
            idCliente={id}
            esGerencia={esGerencia}
            usuario={admin?.email}
          />
        </Tab>

        <Tab eventKey="visitas" title="Visitas">
          <HistorialVisitas cliente={cliente} />
        </Tab>
      </Tabs>

      {esGerencia && (
        <Modal
          show={mostrarConfirmacion}
          onHide={() => setMostrarConfirmacion(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirmar eliminación</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            ¿Estás seguro que querés eliminar a{" "}
            {cliente.name.firstname} {cliente.name.lastname}? Esta
            acción no se puede deshacer.
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setMostrarConfirmacion(false)}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarEliminar}>
              Sí, eliminar
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default DetalleCliente;
