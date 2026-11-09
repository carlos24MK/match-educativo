import { createRoot } from 'react-dom/client';
import '../css/app.css';
import Registro from './components/registro.jsx';
import Login from './components/login.jsx';
import Dashboard from './components/dashboard.jsx';
import Seguridad from './components/Seguridad.jsx';
import RecuperarContrasena from './components/RecuperarContrasena.jsx';
import Inicio from './components/inicio.jsx';

const contenedor = document.getElementById('app');
let pantalla;

// Selecciona el componente según la dirección abierta.
switch (window.location.pathname) {
    case '/':
        pantalla = <Inicio />;
        break;
    case '/login':
        pantalla = <Login />;
        break;

    case '/dashboard':
        pantalla = <Dashboard />;
        break;
    case '/perfil':
        pantalla = <Dashboard perfil />;
        break;

    case '/buscar-estudiantes':
        pantalla = <Dashboard buscar />;
        break;

    case '/matches':
        pantalla = <Dashboard seccion="matches" />;
        break;

    case '/mensajes':
        pantalla = <Dashboard seccion="mensajes" />;
        break;

    case '/notificaciones':
        pantalla = <Dashboard seccion="notificaciones" />;
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
