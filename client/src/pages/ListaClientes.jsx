import "../css/listaclientes.css"
import { useState } from "react";
import { Link } from "react-router-dom";
import FormCliente from "../components/FormCliente";
// COMMIT: "refactor: extraer la carga de clientes a un hook useClientes"
// (antes: este import no existia, tampoco useEffect en este archivo)
import useClientes from "../hooks/useClientes";

// Mismos valores que el enum de server/models/Cliente.js
const SUCURSALES = ["Casa Central", "Sucursal Norte", "Sucursal Sur"];

const ListaClientes = () => {
  // COMMIT: "refactor: extraer la carga de clientes a un hook useClientes"
  // (antes aca estaban useState de clientes/loading/error + el useEffect con
  // el fetch/axios y AbortController, y la funcion agregarCliente local;
  // todo eso se movio al hook. Ese fetch habia pasado antes por los commits
  // "fix: usar optional chaining..." (5), "fix: refrescar la lista..." (6),
  // "fix: cancelar peticiones fetch..." (7) y
  // "refactor: centralizar llamadas HTTP en clientesService" (11))
  const { clientes, loading, error, agregarCliente } = useClientes();
  const [busqueda, setBusqueda] = useState("");
  const [sucursal, setSucursal] = useState("");

  // COMMIT: "fix: usar optional chaining en el filtro y la tabla de clientes"
  // (antes: cliente.name.lastname.toLowerCase()... sin los ?.)
  // El filtro por sucursal se hace sobre la lista ya cargada (sin otra
  // request), asi funciona igual con el backend propio y con FakeStoreAPI.
  const clientesFiltrados = clientes.filter(
    (cliente) =>
      (sucursal === "" || cliente.sucursal === sucursal) &&
      (cliente.name?.lastname
        ?.toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      cliente.address?.city
        ?.toLowerCase()
        .includes(busqueda.toLowerCase()))
  );

  if (loading) {
    return <h2>Cargando clientes...</h2>;
  }

  if (error) {
    return <h2>Error al cargar los clientes.</h2>;
  }

  return (
    <div className="clientes-container">

      <h1>Clientes</h1>
      {/* COMMIT: "fix: refrescar la lista de clientes al crear uno nuevo" */}
      {/* (antes: <FormCliente /> sin el prop onClienteCreado) */}
      <FormCliente onClienteCreado={agregarCliente} />

      <hr />

      <div className="contenedor-buscador">

        <h2 className="titulo-buscador">
          Buscar Clientes
        </h2>

        <input
          className="buscador"
          type="text"
          placeholder="Buscar por apellido o ciudad"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <label className="filtro-sucursal">
          Sucursal
          <select
            className="buscador"
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {SUCURSALES.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <p className="cantidad-clientes">
          Clientes encontrados: {clientesFiltrados.length}
        </p>

      </div>


      <div className="tabla-clientes-wrapper">
        <table className="tabla-clientes">

        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Ciudad</th>
            <th>Sucursal</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>

          {clientesFiltrados.map((cliente) => (
            <tr key={cliente.id}>

              <td>{cliente.id}</td>

              {/* COMMIT: "fix: usar optional chaining en el filtro y la tabla de clientes" */}
              {/* (antes: cliente.name.firstname / cliente.name.lastname sin ?.) */}
              <td>
                {cliente.name?.firstname} {cliente.name?.lastname}
              </td>

              <td>{cliente.email}</td>

              <td>{cliente.phone}</td>

              <td>{cliente.address?.city}</td>

              <td>{cliente.sucursal ?? "-"}</td>

              <td>
                <Link
                  className="btn-ficha"
                  to={`/clientes/${cliente.id}`}
                >
                  Ver Ficha Completa
                </Link>
              </td>

            </tr>
          ))}

        </tbody>

      </table>
      </div>
      

    </div>
  );
};

export default ListaClientes;