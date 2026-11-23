import { useEffect, useState } from "react";
import clientesService from "../services/clientesService";

// Trae el resumen [{ sucursal, totalClientes, nuevosUltimos30Dias }] del
// backend propio. Mismo patron que useClientes: AbortController para no
// actualizar el estado si el componente se desmonta antes de la respuesta.
const useResumenSucursales = () => {
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    clientesService
      .obtenerResumenSucursales(controller.signal)
      .then((data) => {
        // FakeStoreAPI (o una VITE_API_URL mal configurada) no devuelve un
        // array: se trata como "no disponible" en vez de romper el render.
        if (!Array.isArray(data)) {
          setError(true);
          setLoading(false);
          return;
        }
        setResumen(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { resumen, loading, error };
};

export default useResumenSucursales;
