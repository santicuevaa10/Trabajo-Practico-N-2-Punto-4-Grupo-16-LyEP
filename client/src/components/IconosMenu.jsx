// Íconos SVG propios (trazo de 24x24 con currentColor), para no sumar una
// librería de íconos. Son decorativos: el texto o el aria-label del enlace
// es lo que leen los lectores de pantalla.
const Icono = ({ children }) => (
  <svg
    className="cf-icono"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const IconoDashboard = () => (
  <Icono>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Icono>
);

export const IconoClientes = () => (
  <Icono>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icono>
);

export const IconoAlertas = () => (
  <Icono>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icono>
);

export const IconoMetricas = () => (
  <Icono>
    <path d="M3 3v18h18" />
    <path d="M7 16v-5" />
    <path d="M12 16V8" />
    <path d="M17 16v-8" />
  </Icono>
);

export const IconoImportar = () => (
  <Icono>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Icono>
);

export const IconoMenu = () => (
  <Icono>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </Icono>
);

export const IconoBuscar = () => (
  <Icono>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icono>
);

export const IconoSalir = () => (
  <Icono>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Icono>
);
