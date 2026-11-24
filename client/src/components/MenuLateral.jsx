import { NavLink } from 'react-router-dom'
import useAutorizaciones from '../hooks/useAutorizaciones'
import {
  IconoDashboard,
  IconoClientes,
  IconoAlertas,
  IconoMetricas,
  IconoImportar,
} from './IconosMenu'

// Secciones de la app. "soloGerencia" replica los permisos que ya tenía el
// Nav anterior: Métricas e Importar solo se muestran a Gerencia.
const SECCIONES = [
  { ruta: '/', texto: 'Dashboard', Icono: IconoDashboard, end: true },
  { ruta: '/clientes', texto: 'Clientes', Icono: IconoClientes },
  { ruta: '/alertas', texto: 'Alertas', Icono: IconoAlertas },
  { ruta: '/metricas', texto: 'Métricas', Icono: IconoMetricas, soloGerencia: true },
  { ruta: '/importar', texto: 'Importar', Icono: IconoImportar, soloGerencia: true },
]

// Lista de navegación compartida por la sidebar (desktop/tablet) y el
// offcanvas (mobile). NavLink agrega la clase "active" al ítem actual;
// "end" evita que Dashboard ("/") quede activo en todas las rutas.
const MenuLateral = ({ alNavegar }) => {
  const { admin } = useAutorizaciones()
  const esGerencia = admin?.sector?.trim() === 'Gerencia'

  const visibles = SECCIONES.filter((s) => !s.soloGerencia || esGerencia)

  return (
    <nav className="cf-menu" aria-label="Secciones">
      <ul>
        {visibles.map(({ ruta, texto, Icono, end }) => (
          <li key={ruta}>
            <NavLink
              to={ruta}
              end={end}
              className="cf-menu-link"
              title={texto}
              onClick={alNavegar}
            >
              <Icono />
              <span className="cf-menu-texto">{texto}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default MenuLateral
