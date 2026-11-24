import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import AutorizacionesProvider from '../context/AutorizacionesContext'
import exportacionesService, { nombreDesdeHeader } from '../services/exportacionesService'

// El resumen por sucursal y las alertas no son parte de estos tests.
vi.mock('../hooks/useResumenSucursales', () => ({
  default: () => ({ resumen: [], loading: false, error: false }),
}))
vi.mock('../hooks/useAlertas', () => ({
  default: () => ({ alertas: [], loading: false, error: false }),
}))
vi.mock('../hooks/useAlertasDocumentos', () => ({
  default: () => ({ vencidos: [], porVencer: [], loading: false, error: false }),
}))

vi.mock('../services/exportacionesService', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    default: {
      exportarDatos: vi.fn(),
      descargarArchivo: vi.fn(),
    },
  }
})

const renderComo = (sector) => {
  localStorage.setItem(
    'admin',
    JSON.stringify({ nombre: 'Prueba', email: 'prueba@gmail.com', sector })
  )
  return render(
    <MemoryRouter>
      <AutorizacionesProvider>
        <Dashboard />
      </AutorizacionesProvider>
    </MemoryRouter>
  )
}

describe('Dashboard - Exportar mis datos', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('muestra el boton a Gerencia', () => {
    renderComo('Gerencia')
    expect(screen.getByRole('button', { name: /exportar mis datos/i })).toBeInTheDocument()
  })

  it('no muestra el boton a Soporte', () => {
    renderComo('Soporte')
    expect(screen.queryByRole('button', { name: /exportar mis datos/i })).not.toBeInTheDocument()
  })

  it('descarga el archivo en el formato elegido', async () => {
    const archivo = new Blob(['{}'])
    exportacionesService.exportarDatos.mockResolvedValue({
      archivo,
      nombre: 'clientflow-export-2026-11-23.zip',
    })
    renderComo('Gerencia')

    fireEvent.click(screen.getByRole('button', { name: /exportar mis datos/i }))
    fireEvent.click(await screen.findByRole('button', { name: /csv/i }))

    await waitFor(() =>
      expect(exportacionesService.descargarArchivo).toHaveBeenCalledWith(
        archivo,
        'clientflow-export-2026-11-23.zip'
      )
    )
    expect(exportacionesService.exportarDatos).toHaveBeenCalledWith('csv')
  })

  it('muestra un error si la exportacion falla', async () => {
    exportacionesService.exportarDatos.mockRejectedValue(new Error('404'))
    renderComo('Gerencia')

    fireEvent.click(screen.getByRole('button', { name: /exportar mis datos/i }))
    fireEvent.click(await screen.findByRole('button', { name: /json/i }))

    expect(await screen.findByText(/no se pudieron exportar los datos/i)).toBeInTheDocument()
    expect(exportacionesService.descargarArchivo).not.toHaveBeenCalled()
  })
})

describe('nombreDesdeHeader', () => {
  it('lee el nombre del header Content-Disposition', () => {
    expect(
      nombreDesdeHeader('attachment; filename="clientflow-export-2026-11-23.json"')
    ).toBe('clientflow-export-2026-11-23.json')
    expect(nombreDesdeHeader(undefined)).toBeUndefined()
  })
})
