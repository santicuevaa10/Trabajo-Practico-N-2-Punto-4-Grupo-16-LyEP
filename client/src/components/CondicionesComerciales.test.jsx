import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CondicionesComerciales from "./CondicionesComerciales";
import clientesService from "../services/clientesService";

vi.mock("../services/clientesService", () => ({
  default: { obtenerCondiciones: vi.fn(), crearCondicion: vi.fn() },
}));

const dias = (n) => new Date(Date.now() + n * 864e5).toISOString();

const historial = [
  { id: "c3", descuento: 20, limiteCredito: 900000, autorizadoPor: "maia@gmail.com", motivo: "Promo futura", vigenteDesde: dias(10), createdAt: dias(0) },
  { id: "c2", descuento: 15, limiteCredito: 500000, autorizadoPor: "jimena@gmail.com", motivo: "Aumento de volumen", vigenteDesde: dias(-5), createdAt: dias(-5) },
  { id: "c1", descuento: 5, limiteCredito: 100000, autorizadoPor: "lourdes@gmail.com", motivo: "Alta", vigenteDesde: dias(-60), createdAt: dias(-60) },
];

describe("CondicionesComerciales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientesService.obtenerCondiciones.mockResolvedValue(historial);
  });

  it("destaca como vigente la condicion mas reciente que ya empezo a regir", async () => {
    render(<CondicionesComerciales idCliente="1" esGerencia={false} usuario="antonella@gmail.com" />);

    const vigente = await screen.findByText("Condición vigente");
    const tarjeta = vigente.closest(".condicion-vigente");
    expect(tarjeta).toHaveTextContent("15%");
    expect(tarjeta).toHaveTextContent("jimena@gmail.com");

    expect(screen.getByText("Programada")).toBeInTheDocument();
    expect(screen.getByText("Reemplazada")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("Soporte ve el historial en modo lectura, sin formulario", async () => {
    render(<CondicionesComerciales idCliente="1" esGerencia={false} usuario="antonella@gmail.com" />);

    expect(await screen.findByText(/modo lectura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar condición/i })).not.toBeInTheDocument();
  });

  it("Gerencia registra una condicion nueva enviando su usuario", async () => {
    const creada = { id: "c4", descuento: 18, limiteCredito: 600000, autorizadoPor: "jimena@gmail.com", motivo: "Renegociación", vigenteDesde: dias(-1), createdAt: dias(0) };
    clientesService.crearCondicion.mockResolvedValue(creada);

    render(<CondicionesComerciales idCliente="1" esGerencia usuario="jimena@gmail.com" />);

    fireEvent.change(await screen.findByLabelText(/descuento/i), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText(/límite de crédito/i), { target: { value: "600000" } });
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "Renegociación" } });
    fireEvent.click(screen.getByRole("button", { name: /registrar condición/i }));

    await waitFor(() => expect(clientesService.crearCondicion).toHaveBeenCalledTimes(1));
    const [idCliente, cuerpo, usuario] = clientesService.crearCondicion.mock.calls[0];
    expect(idCliente).toBe("1");
    expect(cuerpo).toMatchObject({ descuento: 18, limiteCredito: 600000, motivo: "Renegociación" });
    expect(usuario).toBe("jimena@gmail.com");

    await waitFor(() =>
      expect(screen.getByText("Condición vigente").closest(".condicion-vigente")).toHaveTextContent("18%")
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("valida el rango del descuento antes de enviar", async () => {
    render(<CondicionesComerciales idCliente="1" esGerencia usuario="jimena@gmail.com" />);

    fireEvent.change(await screen.findByLabelText(/descuento/i), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/límite de crédito/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "x" } });
    fireEvent.submit(screen.getByRole("button", { name: /registrar condición/i }).closest("form"));

    expect(await screen.findByText(/entre 0 y 100/i)).toBeInTheDocument();
    expect(clientesService.crearCondicion).not.toHaveBeenCalled();
  });
});
