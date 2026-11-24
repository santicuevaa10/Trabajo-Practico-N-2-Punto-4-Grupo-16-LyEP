import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Dropdown } from 'react-bootstrap'
import useAutorizaciones from '../hooks/useAutorizaciones'
import { IconoMenu, IconoBuscar, IconoSalir } from './IconosMenu'

// Nombre de la sección según la ruta actual.
const tituloDeSeccion = (pathname) => {
  if (pathname === '/') return 'Dashboard'
  if (/^\/clientes\/[^/]+/.test(pathname)) return 'Ficha del cliente'
  if (pathname.startsWith('/clientes')) return 'Clientes'
  if (pathname.startsWith('/alertas')) return 'Alertas'
  if (pathname.startsWith('/metricas')) return 'Métricas'
  if (pathname.startsWith('/importar')) return 'Importar clientes'
  return 'ClientFlow'
}

const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?'

const Topbar = ({ onAbrirMenu }) => {
  const { admin, cerrarSesion } = useAutorizaciones()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const [texto, setTexto] = useState(searchParams.get('buscar') ?? '')

  // El buscador global lleva a la lista de clientes con ?buscar=, que
  // ListaClientes usa como valor inicial de su filtro.
  const buscar = (e) => {
    e.preventDefault()
    const consulta = texto.trim()
    navigate(consulta ? `/clientes?buscar=${encodeURIComponent(consulta)}` : '/clientes')
  }

  const manejarCerrarSesion = () => {
    cerrarSesion()
    navigate('/login')
  }

  return (
    <header className="cf-topbar">
      <button
        type="button"
        className="cf-boton-menu"
        onClick={onAbrirMenu}
        aria-label="Abrir menú de navegación"
      >
        <IconoMenu />
      </button>

      {/* No es un h1: cada página ya tiene su propio título principal. */}
      <div className="cf-topbar-titulo">{tituloDeSeccion(pathname)}</div>

      <form className="cf-buscador" role="search" onSubmit={buscar}>
        <label htmlFor="buscador-global" className="visually-hidden">
          Buscar clientes
        </label>
        <IconoBuscar />
        <input
          id="buscador-global"
          type="search"
          placeholder="Buscar cliente por apellido o ciudad"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </form>

      <Dropdown align="end" className="cf-usuario">
        <Dropdown.Toggle className="cf-usuario-toggle" aria-label={`Menú de ${admin?.nombre ?? 'usuario'}`}>
          <span className="cf-avatar" aria-hidden="true">{iniciales(admin?.nombre)}</span>
          <span className="cf-usuario-nombre">{admin?.nombre}</span>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.ItemText className="cf-usuario-datos">
            <strong>{admin?.nombre}</strong>
            <span>{admin?.sector}</span>
          </Dropdown.ItemText>
          <Dropdown.Divider />
          <Dropdown.Item as="button" onClick={manejarCerrarSesion}>
            <IconoSalir /> Cerrar sesión
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </header>
  )
}

export default Topbar
