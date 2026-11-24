import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://fakestoreapi.com";

// Solo existe en el backend propio. Contra FakeStoreAPI la request falla y
// la pantalla de metricas muestra "no disponible" en vez de romperse.
const obtenerResumen = async (signal) => {

    const respuesta = await axios.get(
        `${API_BASE}/metricas/resumen`,
        { signal }
    );

    return respuesta.data;
};

export default {
    obtenerResumen
};
