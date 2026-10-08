import { useEffect, useState } from 'react';
import { enviarFormulario } from '../api.js';
import RecoveryCodes from './RecoveryCodes.jsx';

// Seguridad muestra los códigos dentro del mismo menú que ya teníamos.
export default function Dashboard({ seguridad = false }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [cerrando, setCerrando] = useState(false);

    useEffect(() => {
        const controlador = new AbortController();

        async function cargarUsuario() {
            try {
                const respuesta = await fetch('/api/user', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                    signal: controlador.signal,
                });

                // La sesión venció o ya se cerró.
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
    }, []);

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
            <aside className="bg-[#124277] p-6 text-white md:w-64">
                <div className="rounded-xl bg-[#F7F7F7] p-2">
                    <img
                        src="/images/logo-match-educativo.webp"
                        alt="Match Educativo"
                        width={1536}
                        height={1024}
                        className="mx-auto h-auto w-full max-w-48"
                    />
                </div>

                <nav aria-label="Menú principal" className="mt-6">
                    <a
                        href="/dashboard"
                        aria-current={!seguridad ? 'page' : undefined}
                        className={!seguridad ? 'block rounded bg-white/15 p-3' : 'block rounded p-3'}
                    >
                        Dashboard
                    </a>
                    <a
                        href="/configuracion/seguridad"
                        aria-current={seguridad ? 'page' : undefined}
                        className={seguridad ? 'block rounded bg-white/15 p-3' : 'block rounded p-3'}
                    >
                        Configuración → Seguridad
                    </a>
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

            <main className="flex-1 p-6 sm:p-10">
                <nav
                    aria-label="Ruta de navegación"
                    className="mb-4 text-sm text-[#555555]"
                >
                    <ol className="flex gap-2">
                        <li>Área privada</li>
                        <li aria-hidden="true">/</li>
                        <li aria-current="page">{seguridad ? 'Seguridad' : 'Dashboard'}</li>
                    </ol>
                </nav>

                <h1 className="text-3xl font-bold text-[#124277]">
                    {seguridad ? 'Seguridad' : 'Dashboard'}
                </h1>

                {cargando && (
                    <p role="status" className="mt-4">
                        Cargando tu información...
                    </p>
                )}

                {usuario && !seguridad && (
                    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">
                            Hola, {usuario.name}
                        </h2>

                        <p className="mt-2 text-[#555555]">
                            {usuario.email}
                        </p>

                        <p className="mt-4">
                            Bienvenido a Match Educativo.
                        </p>
                    </section>
                )}

                {usuario && seguridad && <RecoveryCodes />}

                <p role="status" className="mt-4 text-[#555555]">
                    {mensaje}
                </p>
            </main>
        </div>
    );
}
