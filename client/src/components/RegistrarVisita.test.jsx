import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegistrarVisita from "./RegistrarVisita";
import AutorizacionesProvider from "../context/AutorizacionesContext";
import clientesService from "../services/clientesService";

vi.mock("../services/clientesService", () => ({
  default: { registrarVisita: vi.fn() },
}));

const cliente = { id: "abc", name: { firstname: "Farmacia", lastname: "Central" } };

const renderizar = (onRegistrada = vi.fn()) => {
  render(
    <AutorizacionesProvider>
      <RegistrarVisita cliente={cliente} onRegistrada={onRegistrada} />
    </AutorizacionesProvider>
  );
  return onRegistrada;
};

describe("RegistrarVisita", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(
      "admin",
      JSON.stringify({ email: "abril@gmail.com", nombre: "Abril", sector: "Soporte" })
    );
  });

  it("abre el modal con los 4 resultados", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: /registrar visita/i }));

    for (const nombre of [/^pedido$/i, /sin pedido/i, /no atendió/i, /reclamo/i]) {
      expect(screen.getAllByRole("button", { name: nombre }).length).toBeGreaterThan(0);
    }
  });

  it("un clic en el resultado guarda, cierra el modal y muestra el toast", async () => {
    const respuesta = { visita: { id: "v1" }, cliente: { ...cliente, ultimaVisita: new Date().toISOString() } };
    clientesService.registrarVisita.mockResolvedValue(respuesta);
    const onRegistrada = renderizar();

    fireEvent.click(screen.getByRole("button", { name: /registrar visita/i }));
    fireEvent.change(screen.getByLabelText(/nota/i), { target: { value: "  Pidió lista nueva  " } });
    fireEvent.click(screen.getByRole("button", { name: /^pedido$/i }));

    await waitFor(() =>
      expect(clientesService.registrarVisita).toHaveBeenCalledWith(
        "abc",
        { resultado: "pedido", nota: "Pidió lista nueva" },
        "abril@gmail.com"
      )
    );
    expect(await screen.findByText("Visita registrada: Pedido — Farmacia Central")).toBeInTheDocument();
    expect(onRegistrada).toHaveBeenCalledWith(respuesta);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("si falla, deja el modal abierto y muestra el error", async () => {
    clientesService.registrarVisita.mockRejectedValue({ response: { data: { error: "Cliente no encontrado" } } });
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /registrar visita/i }));
    fireEvent.click(screen.getByRole("button", { name: /reclamo/i }));

    expect(await screen.findByText("Cliente no encontrado")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
