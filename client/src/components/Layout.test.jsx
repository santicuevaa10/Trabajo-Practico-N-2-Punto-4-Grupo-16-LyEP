import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Layout from './Layout'
import AutorizacionesProvider from '../context/AutorizacionesContext'

// Muestra la ruta actual para poder verificar las navegaciones.
const RutaActual = () => {
  const { pathname, search } = useLocation()
  return <p data-testid="ruta">{pathname + search}</p>
}

const renderLayout = (sector, ruta = '/') => {
  localStorage.setItem(
    'admin',
    JSON.stringify({ nombre: 'Ana Pérez', email: 'ana@gmail.com', sector })
  )
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AutorizacionesProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<RutaActual />} />
          </Route>
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </AutorizacionesProvider>
    </MemoryRouter>
  )
}

// La sidebar de escritorio (la de mobile es un offcanvas que arranca cerrado).
const sidebar = () => within(screen.getByRole('complementary'))

describe('Layout', () => {
  // jsdom no implementa matchMedia y el Offcanvas de react-bootstrap lo usa.
  beforeAll(() => {
    window.matchMedia ??= (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
  })

  beforeEach(() => {
    localStorage.clear()
  })

  it('Gerencia ve las 5 secciones', () => {
    renderLayout('Gerencia')
    const menu = within(sidebar().getByRole('navigation', { name: 'Secciones' }))
    const links = menu.getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Dashboard', 'Clientes', 'Alertas', 'Métricas', 'Importar'])
  })

  it('Soporte no ve Métricas ni Importar', () => {
    renderLayout('Soporte')
    expect(sidebar().queryByRole('link', { name: /Métricas/ })).not.toBeInTheDocument()
    expect(sidebar().queryByRole('link', { name: /Importar/ })).not.toBeInTheDocument()
    expect(sidebar().getByRole('link', { name: /Alertas/ })).toBeInTheDocument()
  })

  it('resalta el ítem activo y Dashboard no queda activo en otras rutas', () => {
    renderLayout('Soporte', '/clientes/abc123')
    expect(sidebar().getByRole('link', { name: /Clientes/ })).toHaveClass('active')
    expect(sidebar().getByRole('link', { name: /Dashboard/ })).not.toHaveClass('active')
  })

  it('muestra el nombre de la sección en la topbar', () => {
    renderLayout('Soporte', '/clientes/abc123')
    expect(screen.getByRole('banner')).toHaveTextContent('Ficha del cliente')
  })

  it('el buscador global lleva a la lista de clientes con ?buscar=', () => {
    renderLayout('Soporte', '/alertas')
    const buscador = screen.getByRole('searchbox', { name: 'Buscar clientes' })
    fireEvent.change(buscador, { target: { value: 'Pérez Salta' } })
    fireEvent.submit(buscador.closest('form'))
    expect(screen.getByTestId('ruta')).toHaveTextContent('/clientes?buscar=P%C3%A9rez%20Salta')
  })

  it('el menú de usuario muestra nombre y sector, y cierra la sesión', () => {
    renderLayout('Gerencia')
    fireEvent.click(screen.getByRole('button', { name: 'Menú de Ana Pérez' }))
    expect(screen.getByText('Gerencia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }))
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
    expect(localStorage.getItem('admin')).toBeNull()
  })

  it('en mobile el botón de menú abre el offcanvas y se cierra al navegar', async () => {
    renderLayout('Soporte', '/')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    const offcanvas = await screen.findByRole('dialog')
    const linkAlertas = within(offcanvas).getByRole('link', { name: /Alertas/ })
    fireEvent.click(linkAlertas)
    expect(screen.getByTestId('ruta')).toHaveTextContent('/alertas')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('el footer es una sola línea con el grupo correcto', () => {
    renderLayout('Soporte')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('ClientFlow · Grupo 16')
  })
})
