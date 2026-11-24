import '../css/layout.css'
import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Offcanvas } from 'react-bootstrap'
import MenuLateral from './MenuLateral'
import Topbar from './Topbar'
import Footer from './Footer'

// Estructura de las pantallas con sesión iniciada:
// - desktop (>= 992px): sidebar fija de 240px con íconos y texto
// - tablet (768-991px): sidebar colapsada a íconos
// - mobile (< 768px): sin sidebar; el botón de la topbar abre un offcanvas
// Las rutas hijas se dibujan en <Outlet />.
const Layout = () => {
  const [menuMovil, setMenuMovil] = useState(false)
  const cerrarMenuMovil = () => setMenuMovil(false)

  return (
    <div className="cf-layout">
      <aside className="cf-sidebar">
        <Link to="/" className="cf-marca" title="ClientFlow">
          <span className="cf-marca-logo" aria-hidden="true">CF</span>
          <span className="cf-marca-texto">ClientFlow</span>
        </Link>
        <MenuLateral />
      </aside>

      <Offcanvas
        show={menuMovil}
        onHide={cerrarMenuMovil}
        className="cf-offcanvas"
        aria-labelledby="titulo-menu-movil"
      >
        <Offcanvas.Header closeButton closeLabel="Cerrar menú">
          <Offcanvas.Title id="titulo-menu-movil" className="cf-marca">
            <span className="cf-marca-logo" aria-hidden="true">CF</span>
            <span className="cf-marca-texto">ClientFlow</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <MenuLateral alNavegar={cerrarMenuMovil} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="cf-principal">
        <Topbar onAbrirMenu={() => setMenuMovil(true)} />
        <main id="contenido" className="cf-contenido">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
