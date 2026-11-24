import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://fakestoreapi.com";

// Solo existe en el backend propio. Contra FakeStoreAPI la request falla y
// las pantallas muestran "no disponible" en vez de romperse.
const obtenerAlertas = async (tipo, signal) => {

    const respuesta = await axios.get(
        `${API_BASE}/alertas`,
        { params: { tipo }, signal }
    );

    return respuesta.data;
};

export default {
    obtenerAlertas
};
