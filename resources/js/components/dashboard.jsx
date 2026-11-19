import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { enviarFormulario } from '../api.js';
import { useLlamadas } from '../llamadas.js';
import RecoveryCodes from './RecoveryCodes.jsx';
import Skeleton from './Skeleton.jsx';
import Perfil from './Perfil.jsx';
import BuscarEstudiantes from './BuscarEstudiantes.jsx';
import Matches from './Matches.jsx';
import Mensajes from './Mensajes.jsx';
import Notificaciones from './Notificaciones.jsx';
import CambiarContrasena from './CambiarContrasena.jsx';
import ResumenDashboard from './ResumenDashboard.jsx';
import Marca from './Marca.jsx';
import Horarios from './Horarios.jsx';
import Reportes from './Reportes.jsx';
import Administracion from './Administracion.jsx';
import DialogoLlamada from './DialogoLlamada.jsx';

const menu = [
    { id: 'dashboard', ruta: '/dashboard', texto: 'Inicio' },
    { id: 'perfil', ruta: '/perfil', texto: 'Mi perfil' },
    { id: 'habilidades', ruta: '/perfil#habilidades', texto: 'Habilidades' },
    { id: 'horarios', ruta: '/horarios', texto: 'Horarios' },
    { id: 'buscar', ruta: '/buscar-estudiantes', texto: 'Buscar coincidencias' },
    { id: 'matches', ruta: '/matches', texto: 'Mis coincidencias' },
    { id: 'mensajes', ruta: '/mensajes', texto: 'Mensajes' },
    { id: 'notificaciones', ruta: '/notificaciones', texto: 'Notificaciones' },
    { id: 'reportes', ruta: '/reportes', texto: 'Reportes' },
    { id: 'administracion', ruta: '/administracion', texto: 'Administración', icono: 'seguridad', requiereAdmin: true },
];

const iconosMenu = {
    dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    perfil: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    habilidades: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14',
    horarios: 'M4 6h16v14H4z M8 3v6 M16 3v6 M4 10h16 M12 13v4l3 1',
    reportes: 'M5 21V4m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
    buscar: 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M21 21l-4.4-4.4',
    matches: 'M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6 M14 11a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6',
    mensajes: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.8-4A8.5 8.5 0 1 1 21 11.5z M8 11h8 M8 14h5',
    notificaciones: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    seguridad: 'M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10z M9 12l2 2 4-4',
};

function IconoMenu({ tipo }) {
    return (
        <svg aria-hidden="true" className="size-[1.15rem] shrink-0" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconosMenu[tipo]} />
        </svg>
    );
}

export default function Dashboard({ seguridad = false, perfil = false, buscar = false, seccion = '' }) {
    const vista = seccion || (buscar ? 'buscar' : perfil ? 'perfil' : seguridad ? 'seguridad' : 'dashboard');
    const consultaUsuario = vista === 'dashboard' || vista === 'seguridad';
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(consultaUsuario);
    const [mensaje, setMensaje] = useState('');
    const [cerrando, setCerrando] = useState(false);
    const [noLeidas, setNoLeidas] = useState(0);
    const [esAdmin, setEsAdmin] = useState(false);
    const [tiempoRealConectado, setTiempoRealConectado] = useState(false);
    const llamadas = useLlamadas(tiempoRealConectado);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const titulo = seguridad ? 'Seguridad' : vista === 'dashboard' ? 'Panel principal' : menu.find(item => item.id === vista)?.texto;

    useEffect(() => {
        let cliente;
        let cancelado = false;
        async function conectar() {
            try {
                const respuesta = await fetch('/api/tiempo-real/config', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
                if (!respuesta.ok) return;
                const config = await respuesta.json();
                if (cancelado || !config.key || !config.cluster) return;
                cliente = new Pusher(config.key, {
                    cluster: config.cluster,
                    forceTLS: true,
                    enabledTransports: ['ws'],
                    channelAuthorization: {
                        customHandler: async ({ socketId, channelName }, callback) => {
                            try {
                                const auth = await enviarFormulario('/api/tiempo-real/auth', { socket_id: socketId, channel_name: channelName });
                                if (!auth.ok) throw new Error('No se pudo autorizar el canal.');
                                callback(null, await auth.json());
                            } catch (error) { callback(error, null); }
                        },
                    },
                });
                const canal = cliente.subscribe('private-user.' + config.user_id);
                canal.bind('pusher:subscription_succeeded', () => {
                    if (cancelado) return;
                    setTiempoRealConectado(true);
                    window.dispatchEvent(new Event('actividad-tiempo-real'));
                });
                canal.bind('pusher:subscription_error', () => {
                    if (!cancelado) setTiempoRealConectado(false);
                });
                cliente.connection.bind('state_change', ({ current }) => {
                    if (!cancelado && current !== 'connected') setTiempoRealConectado(false);
                });
                canal.bind('actividad', datos => {
                    window.dispatchEvent(new CustomEvent('actividad-tiempo-real', { detail: datos }));
                });
                canal.bind('escritura', datos => {
                    window.dispatchEvent(new CustomEvent('escritura-tiempo-real', { detail: datos }));
                });
                canal.bind('llamada', () => {
                    window.dispatchEvent(new Event('llamada-tiempo-real'));
                });
            } catch {
                // Las consultas periódicas continúan si no hay conexión en tiempo real.
            }
        }
        conectar();
        return () => { cancelado = true; cliente?.disconnect(); };
    }, []);

    useEffect(() => {
        const controlador = new AbortController();
        let consultando = false;
        async function consultarNotificaciones() {
            if (document.hidden || consultando) return;
            consultando = true;
            try {
                const respuesta = await fetch('/api/notificaciones', {
                    credentials: 'same-origin', cache: 'no-store',
                    headers: { Accept: 'application/json' }, signal: controlador.signal,
                });
                if (respuesta.ok) {
                    const datos = await respuesta.json();
                    if (!controlador.signal.aborted) {
                        setNoLeidas(datos.no_leidas);
                        setEsAdmin(datos.es_admin === true);
                    }
                }
            } catch {
                // Se volverá a intentar en la siguiente consulta.
            } finally {
                consultando = false;
            }
        }
        consultarNotificaciones();
        const intervalo = window.setInterval(consultarNotificaciones, 15000);
        document.addEventListener('visibilitychange', consultarNotificaciones);
        window.addEventListener('notificaciones-actualizadas', consultarNotificaciones);
        window.addEventListener('actividad-tiempo-real', consultarNotificaciones);
        return () => {
            controlador.abort();
            window.clearInterval(intervalo);
            document.removeEventListener('visibilitychange', consultarNotificaciones);
            window.removeEventListener('notificaciones-actualizadas', consultarNotificaciones);
            window.removeEventListener('actividad-tiempo-real', consultarNotificaciones);
        };
    }, []);

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
        <div className="area-privada min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-[auto_1fr_auto]">
            <a href="#contenido-privado" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">
                Saltar al contenido
            </a>
            <header className="col-span-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-300 bg-white px-4 py-2 sm:px-6">
                <a href="/" aria-label="Match Educativo, portada" className="rounded-md focus-visible:outline-2 focus-visible:outline-[#0b615a]">
                    <Marca />
                </a>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#123659]">
                    <a href="/perfil" className="rounded-lg px-2 py-2 underline-offset-4 hover:underline focus-visible:outline-2">Mi cuenta</a>
                    <a href="/configuracion/seguridad" className="rounded-lg px-2 py-2 underline-offset-4 hover:underline focus-visible:outline-2">Seguridad</a>
                    <button type="button" disabled={cerrando} onClick={cerrarSesion}
                        className="rounded-lg border border-slate-400 px-2 py-2 hover:bg-slate-100 focus-visible:outline-2 disabled:opacity-60">
                        {cerrando ? 'Cerrando…' : 'Cerrar sesión'}
                    </button>
                </div>
            </header>
            <aside className="menu-privado border-b text-white md:border-r md:border-b-0">
                <div className="p-3 md:sticky md:top-0 md:max-h-dvh md:overflow-y-auto md:p-4">
                    <button type="button" onClick={() => setMenuAbierto(actual => !actual)}
                        aria-expanded={menuAbierto} aria-controls="menu-principal"
                        className="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-white md:hidden">
                        {menuAbierto ? 'Cerrar menú de secciones' : 'Abrir menú de secciones'}
                    </button>

                    <nav id="menu-principal" aria-label="Menú principal"
                        className={(menuAbierto ? 'grid' : 'hidden') + ' mt-2 grid-cols-1 gap-1 min-[400px]:grid-cols-2 md:mt-0 md:grid md:grid-cols-1'}>
                        {menu.filter(item => !item.requiereAdmin || esAdmin).map(item => (
                            <a key={item.id} href={item.ruta} aria-current={vista === item.id ? 'page' : undefined}
                                className="enlace-menu-privado flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:gap-3 md:py-3">
                                <IconoMenu tipo={item.icono ?? item.id} />
                                <span>{item.texto}</span>
                                {item.id === 'notificaciones' && noLeidas > 0 && (
                                    <span className="ml-auto rounded-full bg-[#1ec89f] px-2 py-0.5 text-xs font-bold text-[#10233d]"
                                        aria-label={noLeidas + ' notificaciones sin leer'}>
                                        {noLeidas > 99 ? '99+' : noLeidas}
                                    </span>
                                )}
                            </a>
                        ))}
                    </nav>

                </div>
            </aside>

            <main id="contenido-privado" tabIndex={-1}
                className="mx-auto w-full min-w-0 max-w-[69rem] flex-1 px-5 py-6 sm:px-10 sm:py-8">
                <nav
                    aria-label="Ruta de navegación"
                    className="mb-3 text-sm text-[#465a73]"
                >
                    <ol className="flex flex-wrap items-center gap-2">
                        <li className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-[#d9e5ee]">Área privada</li>
                        <li aria-hidden="true" className="text-[#526982]">›</li>
                        <li aria-current="page" className="font-medium">{titulo}</li>
                    </ol>
                </nav>

                <h1 className="text-3xl font-bold tracking-tight text-[#10233d] sm:text-4xl">
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
                    <div className="perfil-contenido mt-5">
                        <section className="perfil-resumen" aria-labelledby="seguridad-resumen">
                            <div className="relative flex items-center gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dbf5f2] text-[#0b766f]">
                                    <IconoMenu tipo="seguridad" />
                                </span>
                                <div>
                                    <h2 id="seguridad-resumen" className="text-xl font-bold text-white sm:text-2xl">Protege tu cuenta</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-[#d6f0f2]">Administra tu contraseña y prepara una forma de recuperar el acceso.</p>
                                </div>
                            </div>
                        </section>
                        <div className="perfil-datos mt-4 items-start">
                            <CambiarContrasena />
                            <RecoveryCodes />
                        </div>
                    </div>
                )}
                {perfil && <Perfil />}
                {buscar && <BuscarEstudiantes />}
                {vista === 'matches' && <Matches />}
                {vista === 'mensajes' && <Mensajes tiempoRealConectado={tiempoRealConectado} llamadas={llamadas} />}
                {vista === 'notificaciones' && <Notificaciones />}
                {vista === 'horarios' && <Horarios />}
                {vista === 'reportes' && <Reportes />}
                {vista === 'administracion' && <Administracion />}

                <p role="status" className={mensaje ? 'mt-4 text-[#555555]' : 'sr-only'}>
                    {mensaje}
                </p>
            </main>
            {llamadas.llamada && <DialogoLlamada key={llamadas.llamada.id} control={llamadas} />}
            <footer className="col-span-full flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-white px-5 py-4 text-sm text-slate-700">
                <p><strong>Match Educativo</strong> · Proyecto académico de UniEspinal · El Espinal, Tolima</p>
                <a href="/reportes" className="rounded font-semibold text-[#0b615a] underline underline-offset-4 focus-visible:outline-2">Reportar un problema</a>
            </footer>
        </div>
    );
}
