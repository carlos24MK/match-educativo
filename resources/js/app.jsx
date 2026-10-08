import { createRoot } from 'react-dom/client';
import Registro from './components/registro.jsx';
import Login from './components/login.jsx';
import Dashboard from './components/dashboard.jsx';

const contenedor = document.getElementById('app');
let pantalla;

// Selecciona el componente según la dirección abierta.
switch (window.location.pathname) {
    case '/login':
        pantalla = <Login />;
        break;

    case '/dashboard':
        pantalla = <Dashboard />;
        break;

    default:
        pantalla = <Registro />;
}

createRoot(contenedor).render(pantalla);