import { useEffect, useState } from "react";
import alertasService from "../services/alertasService";

// Trae las alertas [{ id, nombre, sucursal, diasSinCompra, estado }].
// Mismo patron que useClientes: AbortController al desmontar o cambiar de tipo.
const useAlertas = (tipo = "inactividad") => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    alertasService
      .obtenerAlertas(tipo, controller.signal)
      .then((data) => {
        if (!Array.isArray(data)) {
          setError(true);
          setLoading(false);
          return;
        }
        setAlertas(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [tipo]);

  return { alertas, loading, error };
};

export default useAlertas;
