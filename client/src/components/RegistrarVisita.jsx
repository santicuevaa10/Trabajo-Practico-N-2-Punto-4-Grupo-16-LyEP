import "../css/registrarvisita.css";
import { useState } from "react";
import { Modal, Button, Alert, Spinner, Toast, ToastContainer } from "react-bootstrap";
import clientesService from "../services/clientesService";
import useAutorizaciones from "../hooks/useAutorizaciones";
import { RESULTADOS_VISITA, MAX_CARACTERES_NOTA } from "../utils/visitas";

// Boton "Registrar visita" + modal de carga rapida (objetivo: < 10 segundos).
// La nota es opcional; un solo clic en el resultado guarda la visita.
const RegistrarVisita = ({ cliente, onRegistrada, className = "" }) => {
  const { admin } = useAutorizaciones();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(null); // resultado en curso
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const nombre = `${cliente.name?.firstname ?? ""} ${cliente.name?.lastname ?? ""}`.trim();

  const cerrar = () => {
    if (guardando) return;
    setAbierto(false);
    setError("");
  };

  const guardar = async (resultado) => {
    setGuardando(resultado);
    setError("");
    try {
      const respuesta = await clientesService.registrarVisita(
        cliente.id,
        { resultado, nota: nota.trim() },
        admin?.email
      );
      setAbierto(false);
      setNota("");
      setToast(`Visita registrada: ${RESULTADOS_VISITA[resultado].etiqueta} — ${nombre}`);
      onRegistrada?.(respuesta);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la visita. Probá de nuevo.");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn-registrar-visita ${className}`}
        onClick={() => setAbierto(true)}
      >
        Registrar visita
      </button>

      <Modal show={abierto} onHide={cerrar} centered>
        <Modal.Header closeButton={!guardando}>
          <Modal.Title>Registrar visita · {nombre}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <label className="nota-visita">
            Nota (opcional)
            <textarea
              rows={2}
              maxLength={MAX_CARACTERES_NOTA}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              disabled={!!guardando}
              placeholder="Ej.: pidió lista de precios nueva"
            />
            <span className="contador-nota">
              {nota.length}/{MAX_CARACTERES_NOTA}
            </span>
          </label>

          <p className="instruccion-visita">¿Cómo te fue? Un clic y queda guardada.</p>

          <div className="botones-resultado">
            {Object.entries(RESULTADOS_VISITA).map(([valor, { etiqueta, icono, variante }]) => (
              <Button
                key={valor}
                variant={variante}
                className="btn-resultado"
                onClick={() => guardar(valor)}
                disabled={!!guardando}
              >
                {guardando === valor ? (
                  <Spinner animation="border" size="sm" role="status" aria-label="Guardando" />
                ) : (
                  <span className="icono-resultado" aria-hidden="true">{icono}</span>
                )}
                {etiqueta}
              </Button>
            ))}
          </div>

          {error && (
            <Alert variant="danger" className="mt-3 mb-0">
              {error}
            </Alert>
          )}
        </Modal.Body>
      </Modal>

      {toast && (
        <ToastContainer position="bottom-end" containerPosition="fixed" className="p-3 toast-visita">
          <Toast bg="success" onClose={() => setToast(null)} delay={3000} autohide>
            <Toast.Header>
              <strong className="me-auto">ClientFlow</strong>
            </Toast.Header>
            <Toast.Body className="text-white">{toast}</Toast.Body>
          </Toast>
        </ToastContainer>
      )}
    </>
  );
};

export default RegistrarVisita;
