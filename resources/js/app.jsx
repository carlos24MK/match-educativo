import { createRoot } from 'react-dom/client';
import '../css/app.css';
import Registro from './components/registro.jsx';
import Login from './components/login.jsx';
import Dashboard from './components/dashboard.jsx';
import Seguridad from './components/Seguridad.jsx';
import RecuperarContrasena from './components/RecuperarContrasena.jsx';

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

    case '/configuracion/seguridad':
        pantalla = <Seguridad />;
        break;

    case '/recuperar-contrasena':
        pantalla = <RecuperarContrasena />;
        break;

    default:
        pantalla = <Registro />;
}

createRoot(contenedor).render(pantalla);
