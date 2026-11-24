import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Metricas from './Metricas'
import AutorizacionesProvider from '../context/AutorizacionesContext'
import metricasService from '../services/metricasService'

vi.mock('../services/metricasService', () => ({
  default: { obtenerResumen: vi.fn() },
}))

const RESUMEN = {
  generadoEn: '2026-11-23T12:00:00.000Z',
  clientesActivos: {
    total: 7,
    porSucursal: [
      { sucursal: 'Casa Central', activos: 4, total: 6 },
      { sucursal: 'Sucursal Norte', activos: 3, total: 3 },
      { sucursal: 'Sucursal Sur', activos: 0, total: 2 },
    ],
  },
  tasaRetencionMensual: {
    mesActual: '2026-11',
    mesAnterior: '2026-10',
    clientesMesAnterior: 4,
    retenidos: 3,
    tasa: 0.75,
  },
  clientesRecuperados: 2,
  vendedoresActivosSemana: { semana: '2026-W48', cantidad: 5 },
  documentosPorVencer: { dias: 30, cantidad: 1 },
}

const renderComo = (sector) => {
  localStorage.setItem(
    'admin',
    JSON.stringify({ nombre: 'Prueba', email: 'prueba@gmail.com', sector })
  )
  return render(
    <AutorizacionesProvider>
      <Metricas />
    </AutorizacionesProvider>
  )
}

const tarjeta = (titulo) =>
  screen.getByRole('heading', { name: titulo }).closest('.kpi-card')

describe('Metricas', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('muestra las 5 tarjetas KPI a Gerencia', async () => {
    metricasService.obtenerResumen.mockResolvedValue(RESUMEN)
    renderComo('Gerencia')

    expect(await screen.findByRole('heading', { name: 'Clientes activos' })).toBeInTheDocument()
    expect(within(tarjeta('Clientes activos')).getByText('7')).toBeInTheDocument()
    expect(within(tarjeta('Retención mensual')).getByText('75%')).toBeInTheDocument()
    expect(within(tarjeta('Retención mensual')).getByText(/3 de 4 clientes que compraron en octubre/)).toBeInTheDocument()
    expect(within(tarjeta('Clientes recuperados')).getByText('2')).toBeInTheDocument()
    expect(within(tarjeta('Vendedores activos')).getByText('5')).toBeInTheDocument()
    expect(within(tarjeta('Documentos por vencer')).getByText('1')).toBeInTheDocument()
  })

  it('dibuja una barra por sucursal con su valor', async () => {
    metricasService.obtenerResumen.mockResolvedValue(RESUMEN)
    renderComo('Gerencia')

    const grafico = await screen.findByRole('img', { name: /clientes activos por sucursal/i })
    expect(grafico.getAttribute('aria-label')).toContain('Casa Central: 4 activos de 6')
    expect(within(grafico).getByText('4 de 6')).toBeInTheDocument()
    expect(within(grafico).getByText('3 de 3')).toBeInTheDocument()
    expect(within(grafico).getByText('0 de 2')).toBeInTheDocument()
    // Sucursal Sur no tiene activos: solo el riel del total, sin barra llena
    expect(grafico.querySelectorAll('.barra-activos')).toHaveLength(2)
    expect(grafico.querySelectorAll('.barra-total')).toHaveLength(3)
  })

  it('muestra un guion si no hubo compras el mes anterior', async () => {
    metricasService.obtenerResumen.mockResolvedValue({
      ...RESUMEN,
      tasaRetencionMensual: { ...RESUMEN.tasaRetencionMensual, clientesMesAnterior: 0, retenidos: 0, tasa: null },
    })
    renderComo('Gerencia')

    expect(await screen.findByText('—')).toBeInTheDocument()
    expect(screen.getByText(/todavía no hay base para calcularla/)).toBeInTheDocument()
  })

  it('no muestra las metricas a Soporte ni llama al backend', () => {
    renderComo('Soporte')

    expect(screen.getByText(/solo el sector gerencia/i)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(metricasService.obtenerResumen).not.toHaveBeenCalled()
  })

  it('muestra "no disponible" si el backend no responde o responde otra cosa', async () => {
    metricasService.obtenerResumen.mockResolvedValue([{ id: 1 }]) // FakeStoreAPI
    renderComo('Gerencia')

    expect(await screen.findByText(/métricas no disponibles/i)).toBeInTheDocument()
  })
})
