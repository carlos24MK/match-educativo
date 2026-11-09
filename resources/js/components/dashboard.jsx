import { useEffect, useState } from 'react';
import { enviarFormulario } from '../api.js';
import RecoveryCodes from './RecoveryCodes.jsx';
import Skeleton from './Skeleton.jsx';
import Perfil from './Perfil.jsx';
import BuscarEstudiantes from './BuscarEstudiantes.jsx';
import Matches from './Matches.jsx';
import Mensajes from './Mensajes.jsx';
import Notificaciones from './Notificaciones.jsx';
import CambiarContrasena from './CambiarContrasena.jsx';
import ResumenDashboard from './ResumenDashboard.jsx';

const menu = [
    { id: 'dashboard', ruta: '/dashboard', texto: 'Dashboard' },
    { id: 'perfil', ruta: '/perfil', texto: 'Mi perfil' },
    { id: 'buscar', ruta: '/buscar-estudiantes', texto: 'Buscar estudiantes' },
    { id: 'matches', ruta: '/matches', texto: 'Mis matches' },
    { id: 'mensajes', ruta: '/mensajes', texto: 'Mensajes' },
    { id: 'notificaciones', ruta: '/notificaciones', texto: 'Notificaciones' },
    { id: 'seguridad', ruta: '/configuracion/seguridad', texto: 'Configuración → Seguridad' },
];

export default function Dashboard({ seguridad = false, perfil = false, buscar = false, seccion = '' }) {
    const vista = seccion || (buscar ? 'buscar' : perfil ? 'perfil' : seguridad ? 'seguridad' : 'dashboard');
    const consultaUsuario = vista === 'dashboard' || vista === 'seguridad';
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(consultaUsuario);
    const [mensaje, setMensaje] = useState('');
    const [cerrando, setCerrando] = useState(false);
    const titulo = seguridad ? 'Seguridad' : menu.find(item => item.id === vista)?.texto ?? 'Dashboard';

    useEffect(() => {
        // Las otras pantallas cargan sus propios datos.
        if (!consultaUsuario) return;

        const controlador = new AbortController();

        async function cargarUsuario() {
            try {
                const respuesta = await fetch('/api/user', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                    signal: controlador.signal,
                });

                if (respuesta.status === 401) {
                    window.location.replace('/login');
                    return;
                }

                if (!respuesta.ok) {
                    throw new Error('No se pudo cargar el usuario.');
                }

                const datos = await respuesta.json();

                if (!controlador.signal.aborted) {
                    setUsuario(datos);
                }
            } catch {
                if (!controlador.signal.aborted) {
                    setMensaje(
                        'No se pudo cargar tu información. Recarga la página.'
                    );
                }
            } finally {
                if (!controlador.signal.aborted) {
                    setCargando(false);
                }
            }
        }

        cargarUsuario();

        // Cancela la petición si el componente deja de mostrarse.
        return () => controlador.abort();
    }, [consultaUsuario]);

    async function cerrarSesion() {
        setCerrando(true);
        setMensaje('');

        try {
            const respuesta = await enviarFormulario('/api/logout', {});

            if (respuesta.ok || respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }

            setMensaje('No se pudo cerrar la sesión. Inténtalo otra vez.');
        } catch {
            setMensaje('No se pudo conectar con Laravel.');
        } finally {
            setCerrando(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#F2F4F7] md:flex">
            <a href="#contenido-privado" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">
                Saltar al contenido
            </a>
            <aside className="bg-[#124277] p-6 text-white md:w-64 md:shrink-0">
                <div className="rounded-xl bg-[#F7F7F7] p-2">
                    <img
                        src="/images/logo-match-educativo.webp"
                        alt="Match Educativo"
                        width={1536}
                        height={1024}
                        className="mx-auto h-auto w-full max-w-48"
                    />
                </div>

                <nav aria-label="Menú principal" className="mt-6 grid grid-cols-2 gap-1 md:grid-cols-1">
                    {menu.map(item => (
                        <a key={item.id} href={item.ruta} aria-current={vista === item.id ? 'page' : undefined}
                            className={'block rounded p-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' + (vista === item.id ? 'bg-white/15' : '')}>
                            {item.texto}
                        </a>
                    ))}
                </nav>

                <button
                    type="button"
                    onClick={cerrarSesion}
                    disabled={cerrando}
                    className="mt-6 w-full rounded border border-white p-3 disabled:opacity-60"
                >
                    {cerrando ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
            </aside>

            <main id="contenido-privado" tabIndex={-1} className="min-w-0 flex-1 p-6 sm:p-10">
                <nav
                    aria-label="Ruta de navegación"
                    className="mb-4 text-sm text-[#555555]"
                >
                    <ol className="flex flex-wrap gap-2">
                        <li>Área privada</li>
                        <li aria-hidden="true">/</li>
                        <li aria-current="page">{titulo}</li>
                    </ol>
                </nav>

                <h1 className="text-3xl font-bold text-[#124277]">
                    {titulo}
                </h1>

                {cargando && (
                    <section className="skeleton-tarjeta" role="status">
                        <p className="sr-only">Cargando tu información...</p>

                        <Skeleton className="skeleton-titulo" />
                        <Skeleton className="skeleton-correo" />
                        <Skeleton className="skeleton-texto" />
                    </section>
                )}

                {usuario && vista === 'dashboard' && <ResumenDashboard usuario={usuario} />}

                {usuario && seguridad && (
                    <>
                        <CambiarContrasena />
                        <RecoveryCodes />
                    </>
                )}
                {perfil && <Perfil />}
                {buscar && <BuscarEstudiantes />}
                {vista === 'matches' && <Matches />}
                {vista === 'mensajes' && <Mensajes />}
                {vista === 'notificaciones' && <Notificaciones />}

                <p role="status" className="mt-4 text-[#555555]">
                    {mensaje}
                </p>
            </main>
        </div>
    );
}
