import '../css/detallecliente.css'
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Modal, Button, Tabs, Tab } from "react-bootstrap";
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

  if(errorCarga){
    return <h2>No se pudo cargar la informacion del cliente.Error al cargar el cliente</h2>
  }


  if (!cliente) {
    return <h2>Cargando cliente...</h2>;
  }

  return (
    <div className="detalle-cliente">
      <h1>Ficha del Cliente</h1>

      {cliente.estadoDocumental === "vencido" && (
        <div className="banner-doc-vencida" role="alert">
          Cliente con documentación vencida: no habilitado para venta
        </div>
      )}

      <div className="encabezado-ficha">
        <p>Rol actual: {role}</p>
        <RegistrarVisita
          cliente={cliente}
          onRegistrada={({ cliente: actualizado }) => setCliente(actualizado)}
        />
      </div>

      {mensaje && <p className = 'mensaje-eliminado'>{mensaje}</p>}

      <Tabs defaultActiveKey="ficha" mountOnEnter className="pestanas-cliente">
        <Tab eventKey="ficha" title="Ficha">
          {editando ? (
            <FormCliente
              clienteInicial={cliente}
              onClienteActualizado={manejarClienteActualizado}
              onCancelar={() => setEditando(false)}
            />
          ) : (
            <Button
              className="mb-3"
              variant="primary"
              onClick={() => {
                setMensaje("");
                setEditando(true);
              }}
            >
              Editar Cliente
            </Button>
          )}

          <p>
            <strong>ID:</strong> {cliente.id}
          </p>

          <p>
            <strong>Nombre:</strong>{" "}
            {cliente.name.firstname} {cliente.name.lastname}
          </p>

          <p>
            <strong>Email:</strong> {cliente.email}
          </p>

          <p>
            <strong>Teléfono:</strong> {cliente.phone}
          </p>

          <h2>Dirección</h2>

          <p>
            <strong>Calle:</strong> {cliente.address.street}
          </p>

          <p>
            <strong>Número:</strong> {cliente.address.number}
          </p>

          <p>
            <strong>Código Postal:</strong> {cliente.address.zipcode}
          </p>

          <p>
            <strong>Ciudad:</strong> {cliente.address.city}
          </p>

          <h2>Cuenta</h2>

          <p>
            <strong>Usuario:</strong> {cliente.username}
          </p>

          <h2>Documentación</h2>

          {(cliente.documentos ?? []).length === 0 ? (
            <p>El cliente no tiene documentos cargados.</p>
          ) : (
            <ul className="lista-documentos">
              {cliente.documentos.map((doc) => {
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

          {errorDocumento && <p className="error-documento">{errorDocumento}</p>}

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

              <label>
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

          {esGerencia && (
            <>
              <button
                className="btn-eliminar"
                onClick={() => setMostrarConfirmacion(true)}
              >
                Eliminar Cliente
              </button>

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
            </>
          )}
        </Tab>

        <Tab eventKey="visitas" title="Visitas">
          <HistorialVisitas cliente={cliente} />
        </Tab>

        <Tab eventKey="condiciones" title="Condiciones comerciales">
          <CondicionesComerciales
            idCliente={id}
            esGerencia={esGerencia}
            usuario={admin?.email}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default DetalleCliente;
