import '../css/login.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAutorizaciones from '../hooks/useAutorizaciones'
import AutorizacionesService from '../services/autorizacionesServices'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState({})
  const [errorLogin, setErrorLogin] = useState('')
  const [cargando, setCargando] = useState(false)
  const { setAdmin } = useAutorizaciones()
  const navigate = useNavigate()
  const validar = () => {
    const nuevosErrores = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      nuevosErrores.email = 'El email es obligatorio'
    } else if (!emailRegex.test(email)) {
      nuevosErrores.email = 'Email inválido'
    }
    if (!password) {
      nuevosErrores.password = 'La contraseña es obligatoria'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }
  const manejarSubmit = async (e) => {
    e.preventDefault()
    if (cargando) return
    setErrorLogin('')
    if (!validar()) return
    setCargando(true)
    try {
      // Promise.resolve deja el flujo listo para cuando login() sea una
      // llamada real a la API (hoy es sincronico).
      const usuario = await Promise.resolve(
        AutorizacionesService.login(email, password)
      )
      if (!usuario) {
        setErrorLogin('Verifique los datos ingresados')
        setCargando(false)
        return
      }
      setAdmin({
        nombre: usuario.nombre,
        email: usuario.email,
        sector: usuario.sector
      })
      navigate('/')
    } catch {
      setErrorLogin('No se pudo iniciar sesión. Intente nuevamente.')
      setCargando(false)
    }
  }
  return (
    <div className="login">
      <section className="login-marca" aria-label="ClientFlow">
        <div className="login-logo">
          <span className="login-logo-icono" aria-hidden="true">◆</span>
          ClientFlow
        </div>
        <p className="login-propuesta">
          Detectá a tiempo los clientes que estás por perder y controlá su
          documentación
        </p>
        <p className="login-bajada">
          Alertas de inactividad, seguimiento de visitas y documentos al día,
          en un solo lugar.
        </p>
      </section>

      <main className="login-panel">
        <form
          className="login-tarjeta"
          onSubmit={manejarSubmit}
          noValidate
          aria-labelledby="login-titulo"
        >
          <h1 id="login-titulo">Iniciar Sesión</h1>
          <p className="login-subtitulo">Ingresá con tu cuenta de ClientFlow</p>

          <div className="login-campo">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errores.email ? 'true' : 'false'}
              aria-describedby="email-error"
            />
            <p id="email-error" className="campo-error" aria-live="polite">
              {errores.email || ' '}
            </p>
          </div>

          <div className="login-campo">
            <label htmlFor="password">Contraseña:</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errores.password ? 'true' : 'false'}
              aria-describedby="password-error"
            />
            <p id="password-error" className="campo-error" aria-live="polite">
              {errores.password || ' '}
            </p>
          </div>

          {errorLogin && (
            <p className="login-error" role="alert">
              {errorLogin}
            </p>
          )}

          <button
            type="submit"
            className="login-boton"
            disabled={cargando}
            aria-busy={cargando}
          >
            {cargando && <span className="login-spinner" aria-hidden="true" />}
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </main>
    </div>
  )
}
export default Login

// PROPUESTA DE MEJORA: formularios con React Hook Form + Zod (no activa)
//
// Login.jsx maneja la validacion a mano: un useState por campo (email,
// password, errores) y una funcion validar() escrita a mano que arma un
// objeto de errores. React Hook Form + Zod reemplaza todo eso por un
// esquema declarativo, con menos codigo y menos re-renders.
//
// Para activarlo de verdad haria falta:
//   npm install react-hook-form zod @hookform/resolvers
//
// -----------------------------------------------------------------------
//
// import { useForm } from 'react-hook-form'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { z } from 'zod'
//
// const esquemaLogin = z.object({
//   email: z.string().min(1, 'El email es obligatorio').email('Email inválido'),
//   password: z.string().min(1, 'La contraseña es obligatoria'),
// })
//
// const LoginConRHF = () => {
//   const [errorLogin, setErrorLogin] = useState('')
//   const { setAdmin } = useAutorizaciones()
//   const navigate = useNavigate()
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm({ resolver: zodResolver(esquemaLogin) })
//
//   const onSubmit = ({ email, password }) => {
//     setErrorLogin('')
//     const usuario = AutorizacionesService.login(email, password)
//     if (!usuario) {
//       setErrorLogin('Verifique los datos')
//       return
//     }
//     setAdmin({ nombre: usuario.nombre, email: usuario.email, sector: usuario.sector })
//     navigate('/')
//   }
//
//   return (
//     <div className="login-container">
//       <h1>Iniciar Sesión</h1>
//       <form onSubmit={handleSubmit(onSubmit)}>
//         <label htmlFor="email">Email:</label>
//         <input id="email" {...register('email')} />
//         <p className="campo-error" aria-live="polite">
//           {errors.email?.message || ' '}
//         </p>
//         <label htmlFor="password">Contraseña:</label>
//         <input id="password" type="password" {...register('password')} />
//         <p className="campo-error" aria-live="polite">
//           {errors.password?.message || ' '}
//         </p>
//         <p className="campo-error" aria-live="polite">{errorLogin || ' '}</p>
//         <button type="submit">Ingresar</button>
//       </form>
//     </div>
//   )
// }
//
// Nota: register('email') conecta el input directo con react-hook-form
// (sin useState manual), y el esquema Zod valida antes de llamar a
// onSubmit — ya no hace falta la funcion validar() de mas arriba.
// FormCliente.jsx se beneficiaria del mismo patron (hoy tiene 4 useState
// de campos + validacion manual de "todos los campos completos").
