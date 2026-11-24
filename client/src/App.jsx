import '../src/css/app.css'
import AppRoutes from './routes/routes'

// La sidebar, la topbar y el footer viven en components/Layout.jsx y solo
// envuelven las rutas protegidas (ver routes/routes.jsx).
function App() {
  return <AppRoutes />
}
export default App
