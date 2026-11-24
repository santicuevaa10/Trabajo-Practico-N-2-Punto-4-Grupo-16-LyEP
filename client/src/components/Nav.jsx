import '../css/nav.css'
import { NavLink } from 'react-router-dom'
import useAutorizaciones from '../hooks/useAutorizaciones'
const Nav = () => {
    const { admin } = useAutorizaciones();
    const esGerencia = admin?.sector?.trim() === 'Gerencia';
    return (
        <nav className="nav">
            <ul className="nav-lista">
                <li>
                    <NavLink to="/">
                        Dashboard
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/clientes">
                        Clientes
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/alertas">
                        Alertas
                    </NavLink>
                </li>
                {esGerencia && (
                    <li>
                        <NavLink to="/importar">
                            Importar
                        </NavLink>
                    </li>
                )}
                {esGerencia && (
                    <li>
                        <NavLink to="/metricas">
                            Métricas
                        </NavLink>
                    </li>
                )}
            </ul>
        </nav>
    );
    
};
export default Nav;