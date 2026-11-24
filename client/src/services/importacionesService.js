import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://fakestoreapi.com";
const URL = `${API_BASE}/importaciones`;

// Sube el CSV exportado del ERP. Con simulacion = true el backend valida
// y devuelve que haria con cada fila, sin escribir en la base.
const importarClientes = async (archivo, { simulacion }) => {
    const formulario = new FormData();
    formulario.append("archivo", archivo);

    const respuesta = await axios.post(
        `${URL}/clientes`,
        formulario,
        { params: simulacion ? { simulacion: true } : {} }
    );

    return respuesta.data;
};

export default {
    importarClientes
};
