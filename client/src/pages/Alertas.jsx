// La tabla reutiliza los estilos de la lista de clientes.
import "../css/listaclientes.css";
import "../css/alertas.css";
import { Link } from "react-router-dom";
import { Badge } from "react-bootstrap";
import useAlertas from "../hooks/useAlertas";

const ESTADOS = {
  en_riesgo: { texto: "En riesgo", variante: "warning" },
  inactivo: { texto: "Inactivo", variante: "danger" },
};

const textoDias = (dias) =>
  dias === null || dias === undefined ? "Sin datos de compra" : `${dias} días`;

const Alertas = () => {
  const { alertas, loading, error } = useAlertas("inactividad");

  if (loading) {
    return <h2>Cargando alertas...</h2>;
  }

  if (error) {
    return (
      <div className="alertas-container">
        <h1>Alertas de inactividad</h1>
        <p className="alertas-estado">
          Alertas no disponibles (requieren el backend propio).
        </p>
      </div>
    );
  }

  const enRiesgo = alertas.filter((a) => a.estado === "en_riesgo").length;
  const inactivos = alertas.filter((a) => a.estado === "inactivo").length;

  return (
    <div className="alertas-container">
      <h1>Alertas de inactividad</h1>

      <p className="alertas-resumen">
        <Badge bg="warning" text="dark">{enRiesgo} en riesgo</Badge>{" "}
        <Badge bg="danger">{inactivos} inactivos</Badge>
      </p>

      {alertas.length === 0 ? (
        <p className="alertas-estado">
          No hay clientes en riesgo: todos compraron recientemente.
        </p>
      ) : (
        <div className="tabla-clientes-wrapper">
          <table className="tabla-clientes">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Sucursal</th>
                <th>Días sin compra</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta) => {
                const estado = ESTADOS[alerta.estado] ?? {
                  texto: alerta.estado,
                  variante: "secondary",
                };
                return (
                  <tr key={alerta.id}>
                    <td>{alerta.nombre || "-"}</td>
                    <td>{alerta.sucursal}</td>
                    <td>{textoDias(alerta.diasSinCompra)}</td>
                    <td>
                      <Badge
                        bg={estado.variante}
                        text={estado.variante === "warning" ? "dark" : undefined}
                        className="badge-estado"
                      >
                        {estado.texto}
                      </Badge>
                    </td>
                    <td>
                      <Link className="btn-ficha" to={`/clientes/${alerta.id}`}>
                        Ver Ficha
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Alertas;
