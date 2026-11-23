import '../css/formcliente.css'
import { useState } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import clientesService from "../services/clientesService";

// COMMIT: "fix: refrescar la lista de clientes al crear uno nuevo"
// (antes: const FormCliente = () => { ... }, sin el prop onClienteCreado)
// Con clienteInicial el formulario pasa a modo edicion: arranca con los
// datos del cliente y al guardar hace PUT en vez de POST.
const FormCliente = ({ onClienteCreado, clienteInicial, onClienteActualizado, onCancelar }) => {

    const modoEdicion = Boolean(clienteInicial);

    const [nombre, setNombre] = useState(clienteInicial?.name?.firstname ?? "");
    const [email, setEmail] = useState(clienteInicial?.email ?? "");
    const [telefono, setTelefono] = useState(clienteInicial?.phone ?? "");
    const [ciudad, setCiudad] = useState(clienteInicial?.address?.city ?? "");

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const manejarSubmit = async (e) => {

        e.preventDefault();

        setMensaje("");
        setError("");

        if (
            nombre.trim() === "" ||
            email.trim() === "" ||
            telefono.trim() === "" ||
            ciudad.trim() === ""
        ) {

            setError("Complete todos los campos.");

            return;
        }

        if (modoEdicion) {

            // Solo los campos que muestra el formulario: el resto
            // (apellido, calle, numero...) queda como estaba.
            const cambios = {
                email: email.trim(),
                name: { firstname: nombre.trim() },
                address: { city: ciudad.trim() },
                phone: telefono.trim()
            };

            try {

                setLoading(true);

                const respuesta =
                    await clientesService.actualizarCliente(
                        clienteInicial.id,
                        cambios
                    );

                // Se combina con lo que ya habia por si la API devuelve
                // solo los campos enviados (FakeStoreAPI hace eso).
                onClienteActualizado?.({
                    ...clienteInicial,
                    ...respuesta,
                    id: clienteInicial.id,
                    name: { ...clienteInicial.name, ...respuesta?.name, ...cambios.name },
                    address: { ...clienteInicial.address, ...respuesta?.address, ...cambios.address }
                });

            } catch (err) {

                setError(
                    err.response?.data?.error ??
                    "Ocurrió un error al actualizar el cliente."
                );

            } finally {

                setLoading(false);

            }

            return;
        }

        const nuevoCliente = {

            email,

            username: nombre.toLowerCase().replace(/\s/g, ""),

            password: "1234",

            name: {
                firstname: nombre,
                lastname: "-"
            },

            address: {
                city: ciudad
            },

            phone: telefono
        };

        try {

            setLoading(true);

            const respuesta =
                await clientesService.crearCliente(
                    nuevoCliente
                );

            setMensaje(
                `Cliente creado correctamente. ID: ${respuesta.id}`
            );

            // COMMIT: "fix: refrescar la lista de clientes al crear uno nuevo"
            // (antes: esta linea no existia, ListaClientes no se enteraba del alta)
            onClienteCreado?.({ ...nuevoCliente, id: respuesta.id });

            setNombre("");
            setEmail("");
            setTelefono("");
            setCiudad("");

        } catch {

            setError(
                "Ocurrió un error al crear el cliente."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className='formulario-cliente'>

            <h3>{modoEdicion ? "Editar Cliente" : "Nuevo Cliente"}</h3>

            <Form onSubmit={manejarSubmit}>

                <Form.Group className="mb-3">

                    <Form.Label>Nombre</Form.Label>

                    <Form.Control
                        type="text"
                        value={nombre}
                        onChange={(e) =>
                            setNombre(e.target.value)
                        }
                    />

                </Form.Group>

                <Form.Group className="mb-3">

                    <Form.Label>Email</Form.Label>

                    <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />

                </Form.Group>

                <Form.Group className="mb-3">

                    <Form.Label>Teléfono</Form.Label>

                    <Form.Control
                        type="text"
                        value={telefono}
                        onChange={(e) =>
                            setTelefono(e.target.value)
                        }
                    />

                </Form.Group>

                <Form.Group className="mb-3">

                    <Form.Label>Ciudad</Form.Label>

                    <Form.Control
                        type="text"
                        value={ciudad}
                        onChange={(e) =>
                            setCiudad(e.target.value)
                        }
                    />

                </Form.Group>

                <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                >

                    {
                        loading
                            ? <Spinner size="sm" />
                            : modoEdicion ? "Guardar Cambios" : "Guardar Cliente"
                    }

                </Button>

                {
                    modoEdicion && onCancelar &&
                    <Button
                        className="ms-2"
                        variant="secondary"
                        type="button"
                        disabled={loading}
                        onClick={onCancelar}
                    >
                        Cancelar
                    </Button>
                }

            </Form>

            {
                mensaje &&
                <Alert
                    className="mt-3"
                    variant="success"
                >
                    {mensaje}
                </Alert>
            }

            {
                error &&
                <Alert
                    className="mt-3"
                    variant="danger"
                >
                    {error}
                </Alert>
            }

        </div>

    );
};

export default FormCliente;