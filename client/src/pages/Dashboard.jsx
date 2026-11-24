import '../css/dashboard.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dropdown, Spinner, Alert } from 'react-bootstrap'
import useAutorizaciones from '../hooks/useAutorizaciones'
import exportacionesService from '../services/exportacionesService'
import useResumenSucursales from '../hooks/useResumenSucursales'
import useAlertas from '../hooks/useAlertas'
import useAlertasDocumentos from '../hooks/useAlertasDocumentos'

const ESTADOS_ATENCION = {
  en_riesgo: { texto: 'En riesgo', clase: 'badge-riesgo' },
  inactivo: { texto: 'Inactivo', clase: 'badge-inactivo' },
}

const MAX_ATENCION = 5

const saludoSegunHora = (hora) => {
  if (hora < 12) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const fechaDeHoy = () => {
  const texto = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const textoDias = (dias) =>
  dias == null ? 'Sin compras registradas' : `${dias} días sin comprar`

// Una tarjeta KPI: numero grande, etiqueta y una linea de variacion.
// valor === null -> el dato no esta disponible y se muestra "—".
const KpiCard = ({ etiqueta, valor, loading, variacion, to }) => {
  const contenido = (
    <>
      <span className="kpi-etiqueta">{etiqueta}</span>
      <span className="kpi-valor">
        {loading ? <Spinner size="sm" aria-label="Cargando" /> : (valor ?? '—')}
      </span>
      <span className="kpi-variacion">{variacion ?? '—'}</span>
    </>
  )
  return to ? (
    <Link to={to} className="kpi-card kpi-card-link">{contenido}</Link>
  ) : (
    <div className="kpi-card">{contenido}</div>
  )
}

const Dashboard = () => {
  const { admin } = useAutorizaciones()
  const { resumen, loading, error } = useResumenSucursales()
  const alertas = useAlertas('inactividad')
  const documentos = useAlertasDocumentos()
  const esGerencia = admin?.sector?.trim() === 'Gerencia'

  const [exportando, setExportando] = useState(false)
  const [errorExportacion, setErrorExportacion] = useState('')

  const exportar = async (formato) => {
    setErrorExportacion('')
    setExportando(true)
    try {
      const { archivo, nombre } = await exportacionesService.exportarDatos(formato)
      exportacionesService.descargarArchivo(archivo, nombre)
    } catch {
      setErrorExportacion('No se pudieron exportar los datos. Intente nuevamente.')
    } finally {
      setExportando(false)
    }
  }

  // --- KPIs a partir de los datos que ya existen -------------------------
  const resumenOk = !loading && !error
  const totalClientes = resumenOk
    ? resumen.reduce((suma, s) => suma + s.totalClientes, 0)
    : null
  const nuevos30Dias = resumenOk
    ? resumen.reduce((suma, s) => suma + s.nuevosUltimos30Dias, 0)
    : null

  const alertasOk = !alertas.loading && !alertas.error
  const enRiesgo = alertasOk
    ? alertas.alertas.filter((a) => a.estado === 'en_riesgo').length
    : null
  const inactivos = alertasOk
    ? alertas.alertas.filter((a) => a.estado === 'inactivo').length
    : null

  const documentosOk = !documentos.loading && !documentos.error
  const docsPorVencer = documentosOk ? documentos.porVencer.length : null

  // TODO: la variacion contra el periodo anterior necesita un endpoint con
  // historico (por ejemplo GET /metricas/resumen?comparar=mes-anterior) que
  // todavia no existe. Mientras tanto las tarjetas muestran "—", salvo donde
  // hay un dato complementario real para mostrar.
  const kpis = [
    {
      etiqueta: 'Total de clientes',
      valor: totalClientes,
      loading,
      variacion: null, // TODO: variacion mensual (endpoint pendiente)
    },
    {
      etiqueta: 'Nuevos en 30 días',
      valor: nuevos30Dias,
      loading,
      variacion: null, // TODO: comparar con los 30 dias anteriores (endpoint pendiente)
    },
    {
      etiqueta: 'En riesgo',
      valor: enRiesgo,
      loading: alertas.loading,
      variacion: inactivos != null ? `${inactivos} inactivos` : null,
      to: '/alertas',
    },
    {
      etiqueta: 'Documentación por vencer',
      valor: docsPorVencer,
      loading: documentos.loading,
      variacion: documentosOk ? `${documentos.vencidos.length} vencidos` : null,
    },
  ]

  const requierenAtencion = alertas.alertas.slice(0, MAX_ATENCION)
  const maxSucursal = Math.max(1, ...resumen.map((s) => s.totalClientes))

  return (
    <div className="dashboard">
      <header className="dashboard-encabezado">
        <div>
          <p className="dashboard-fecha">{fechaDeHoy()}</p>
          <h1>
            {saludoSegunHora(new Date().getHours())}, {admin?.nombre}
          </h1>
          <p className="dashboard-sector">
            Sector <strong>{admin?.sector}</strong>
          </p>
        </div>

        {esGerencia && (
          <div className="exportar-datos">
            <Dropdown align="end">
              <Dropdown.Toggle className="btn-exportar" disabled={exportando}>
                {exportando
                  ? <><Spinner size="sm" /> Exportando...</>
                  : 'Exportar mis datos'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as="button" onClick={() => exportar('csv')}>
                  CSV (archivo .zip)
                </Dropdown.Item>
                <Dropdown.Item as="button" onClick={() => exportar('json')}>
                  JSON
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
      </header>

      {errorExportacion && (
        <Alert variant="danger">{errorExportacion}</Alert>
      )}

      <section className="dashboard-kpis" aria-label="Indicadores principales">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.etiqueta} {...kpi} />
        ))}
      </section>

      <div className="dashboard-columnas">
        <section className="dashboard-panel" aria-labelledby="titulo-atencion">
          <div className="panel-encabezado">
            <h2 id="titulo-atencion">Clientes que requieren atención</h2>
            <Link to="/alertas" className="panel-link">Ver todas</Link>
          </div>

          {alertas.loading && <p className="panel-estado">Cargando alertas...</p>}
          {alertas.error && (
            <p className="panel-estado">
              Alertas no disponibles (requiere el backend propio).
            </p>
          )}
          {alertasOk && requierenAtencion.length === 0 && (
            <p className="panel-estado">
              No hay clientes en riesgo: todos compraron recientemente.
            </p>
          )}

          {alertasOk && requierenAtencion.length > 0 && (
            <ul className="atencion-lista">
              {requierenAtencion.map((cliente) => {
                const estado = ESTADOS_ATENCION[cliente.estado]
                return (
                  <li key={cliente.id} className="atencion-item">
                    <div className="atencion-datos">
                      <span className="atencion-nombre">
                        {cliente.nombre || 'Cliente sin nombre'}
                      </span>
                      <span className="atencion-detalle">
                        {cliente.sucursal} · {textoDias(cliente.diasSinCompra)}
                      </span>
                    </div>
                    {estado && (
                      <span className={`badge-atencion ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    )}
                    <Link
                      to={`/clientes/${cliente.id}`}
                      className="btn-ver"
                      aria-label={`Ver ${cliente.nombre || 'cliente'}`}
                    >
                      Ver
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="dashboard-panel" aria-labelledby="titulo-sucursales">
          <div className="panel-encabezado">
            <h2 id="titulo-sucursales">Clientes por sucursal</h2>
          </div>

          {loading && <p className="panel-estado">Cargando resumen...</p>}
          {error && (
            <p className="panel-estado">
              Resumen por sucursal no disponible (requiere el backend propio).
            </p>
          )}

          {resumenOk && (
            <ul className="sucursales-barras">
              {resumen.map((item) => (
                <li key={item.sucursal} className="barra-fila">
                  <div className="barra-rotulo">
                    <span className="barra-nombre">{item.sucursal}</span>
                    <span className="barra-valor">
                      {item.totalClientes}
                      {item.nuevosUltimos30Dias > 0 && (
                        <span className="barra-nuevos">
                          {' '}(+{item.nuevosUltimos30Dias} nuevos)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="barra-pista" aria-hidden="true">
                    <div
                      className="barra-relleno"
                      style={{ width: `${(item.totalClientes / maxSucursal) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
