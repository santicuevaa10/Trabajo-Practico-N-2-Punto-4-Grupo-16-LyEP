import { useEffect, useState } from "react";
import alertasService from "../services/alertasService";

// GET /alertas?tipo=documentos devuelve un objeto (no un array como el de
// inactividad): { total, vencidos: [...], porVencer: [...] }. Por eso no se
// reutiliza useAlertas, que trata cualquier respuesta que no sea array como error.
const useAlertasDocumentos = () => {
  const [documentos, setDocumentos] = useState({ vencidos: [], porVencer: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    alertasService
      .obtenerAlertas("documentos", controller.signal)
      .then((data) => {
        if (!Array.isArray(data?.vencidos) || !Array.isArray(data?.porVencer)) {
          setError(true);
          setLoading(false);
          return;
        }
        setDocumentos({ vencidos: data.vencidos, porVencer: data.porVencer });
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { ...documentos, loading, error };
};

export default useAlertasDocumentos;
