import { Routes, Route } from 'react-router-dom'

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import ListaClientes from '../pages/ListaClientes'
import DetalleCliente from '../pages/DetalleCliente'
import Alertas from '../pages/Alertas'
import ErrorPage from '../pages/ErrorPage'
import Importar from '../pages/Importar'
import RutaProtegida from '../components/RutaProtegida'
const AppRoutes = () => {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RutaProtegida>
            <Dashboard />
          </RutaProtegida>
        }
      />
      <Route
        path="/clientes"
        element={
          <RutaProtegida>
            <ListaClientes />
          </RutaProtegida>
        }
      />
      <Route
        path="/clientes/:id"
        element={
         <RutaProtegida>
          <DetalleCliente />
         </RutaProtegida>
      }
      />
      <Route
        path="/alertas"
        element={
          <RutaProtegida>
            <Alertas />
          </RutaProtegida>
        }
      />
      <Route
        path="/importar"
        element={
          <RutaProtegida>
            <Importar />
          </RutaProtegida>
        }
      />
      <Route path="*" element={<ErrorPage />} />

    </Routes>
  )
}
export default AppRoutes