// COMMIT: "refactor: extraer la carga de clientes a un hook useClientes"
// (archivo nuevo: esta logica antes vivia toda adentro de ListaClientes.jsx)
import { useEffect, useState } from "react";
import clientesService from "../services/clientesService";

const useClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    clientesService
      .obtenerClientes(controller.signal)
      .then((data) => {
        // Si la API responde algo que no es un array (por ejemplo, HTML
        // en vez de JSON cuando VITE_API_URL esta mal configurada), se
        // trata como error en vez de romper el .filter() de ListaClientes.
        if (!Array.isArray(data)) {
          setError(true);
          setLoading(false);
          return;
        }
        setClientes(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const agregarCliente = (cliente) => {
    setClientes((previos) => [...previos, cliente]);
  };

  // Reemplaza un cliente de la lista por su version actualizada
  // (por ejemplo, despues de registrar una visita).
  const actualizarCliente = (actualizado) => {
    setClientes((previos) =>
      previos.map((c) => (c.id === actualizado.id ? actualizado : c))
    );
  };

  return { clientes, loading, error, agregarCliente, actualizarCliente };
};

export default useClientes;
