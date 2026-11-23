import '../css/dashboard.css'
import { Link } from 'react-router-dom'
import useAutorizaciones from '../hooks/useAutorizaciones'
import useResumenSucursales from '../hooks/useResumenSucursales'
import useAlertas from '../hooks/useAlertas'

const Dashboard = () => {
  const { admin } = useAutorizaciones()
  const { resumen, loading, error } = useResumenSucursales()
  const alertas = useAlertas('inactividad')
  const enRiesgo = alertas.alertas.filter((a) => a.estado === 'en_riesgo').length
  const inactivos = alertas.alertas.filter((a) => a.estado === 'inactivo').length

  return (
    <div className="dashboard">

      <h1>Panel de Control de Clientes</h1>
        
          <div className="user-card">
            <h3>Usuario conectado</h3>

            <p><strong>Administrador:</strong> {admin.nombre}</p>
            <p><strong>Email:</strong> {admin.email}</p>
            <p><strong>Sector:</strong> {admin.sector}</p>
          </div>
          <div className="dashboard-cards">

            <div className="dashboard-card">
              <h3>Clientes</h3>
              <p>10</p>
            </div>

            <div className="dashboard-card">
              <h3>Gerencia</h3>
              <p>3</p>
            </div>

            <div className="dashboard-card">
              <h3>Soporte</h3>
              <p>3</p>
            </div>

            <Link to="/alertas" className="dashboard-card kpi-alertas">
              <h3>Alertas</h3>
              {alertas.loading && <span className="kpi-nuevos">Cargando...</span>}
              {alertas.error && <span className="kpi-nuevos">No disponible</span>}
              {!alertas.loading && !alertas.error && (
                <>
                  <p>{enRiesgo + inactivos}</p>
                  <span className="kpi-nuevos">
                    {enRiesgo} en riesgo · {inactivos} inactivos
                  </span>
                </>
              )}
            </Link>
          </div>

          <section className="dashboard-sucursales">
            <h2>Clientes por sucursal</h2>

            {loading && <p className="sucursales-estado">Cargando resumen...</p>}

            {error && (
              <p className="sucursales-estado">
                Resumen por sucursal no disponible (requiere el backend propio).
              </p>
            )}

            {!loading && !error && (
              <div className="dashboard-cards">
                {resumen.map((item) => (
                  <div className="dashboard-card kpi-sucursal" key={item.sucursal}>
                    <h3>{item.sucursal}</h3>
                    <p>{item.totalClientes}</p>
                    <span className="kpi-nuevos">
                      +{item.nuevosUltimos30Dias} nuevos en 30 días
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

    </div>
  )
}

export default Dashboard