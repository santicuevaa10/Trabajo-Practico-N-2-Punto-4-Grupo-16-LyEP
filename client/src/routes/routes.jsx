import { Routes, Route } from 'react-router-dom'

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import ListaClientes from '../pages/ListaClientes'
import DetalleCliente from '../pages/DetalleCliente'
import Alertas from '../pages/Alertas'
import ErrorPage from '../pages/ErrorPage'
import Importar from '../pages/Importar'
import Metricas from '../pages/Metricas'
import RutaProtegida from '../components/RutaProtegida'
import Layout from '../components/Layout'

const AppRoutes = () => {
  return (
    <Routes>

      {/* Sin layout */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas: RutaProtegida controla la sesión una sola vez y
          Layout (sidebar + topbar + footer) dibuja cada página en su <Outlet />. */}
      <Route
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<ListaClientes />} />
        <Route path="/clientes/:id" element={<DetalleCliente />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/importar" element={<Importar />} />
        <Route path="/metricas" element={<Metricas />} />
      </Route>

      {/* Sin layout */}
      <Route path="*" element={<ErrorPage />} />

    </Routes>
  )
}
export default AppRoutes
