import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://fakestoreapi.com";
const URL = `${API_BASE}/exportaciones/clientes`;

// Nombre que se usa si el servidor no manda Content-Disposition.
const nombrePorDefecto = (formato) => {
    const hoy = new Date();
    const dd = (n) => String(n).padStart(2, "0");
    const fecha = `${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}`;
    return `clientflow-export-${fecha}.${formato === "csv" ? "zip" : "json"}`;
};

export const nombreDesdeHeader = (contentDisposition) => {
    const coincidencia = /filename="?([^";]+)"?/i.exec(contentDisposition ?? "");
    return coincidencia?.[1];
};

const exportarDatos = async (formato) => {

    const respuesta = await axios.get(URL, {
        params: { formato },
        responseType: "blob"
    });

    return {
        archivo: respuesta.data,
        nombre:
            nombreDesdeHeader(respuesta.headers["content-disposition"]) ??
            nombrePorDefecto(formato)
    };
};

// Dispara la descarga en el navegador a partir del archivo recibido.
const descargarArchivo = (archivo, nombre) => {
    const url = window.URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
};

export default {
    exportarDatos,
    descargarArchivo
};
