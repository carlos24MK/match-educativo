import { useState } from "react";
import { enviarFormulario } from "../api.js";

export default function Login() {
    const [datos, setDatos] = useState({ email: '', password: '' });
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);

    function cambiarCampo(evento) {
        setDatos({
            ...datos,
            [evento.target.name]: evento.target.value,
        });
    }

    async function iniciarSesion(evento) {
        evento.preventDefault();
        setEnviando(true);
        setMensaje('Iniciando sesión...');

        try {
            const respuesta = await enviarFormulario('/api/login', datos);
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                // Comprueba que Laravel reconoce la sesión en otra petición.
                const sesion = await fetch('/api/user', {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });

                if (!sesion.ok) {
                    setMensaje('No se pudo confirmar la sesión. Recarga la página.');
                    return;
                }

               window.location.replace('/dashboard');
            } else if (respuesta.status === 422) {
                const errores = Object.values(resultado.errors ?? {}).flat();
                setMensaje(errores.join(' ') || 'Revisa los datos enviados.');
            } else if (respuesta.status === 429) {
                setMensaje('Demasiados intentos. Espera un minuto.');
            } else {
                setMensaje('No se pudo iniciar sesión.');
            }
        } catch {
            setMensaje('No se pudo completar la petición. Revisa la conexión y Laravel.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F2F4F7] px-4 py-8">
            <form
                onSubmit={iniciarSesion}
                aria-labelledby="titulo-login"
                className="grid w-full max-w-md gap-4 rounded-2xl bg-[#F7F7F7] p-6 shadow-lg sm:p-8"
            >
                <header className="text-center">
                    <img
                        src="/images/logo-match-educativo.webp"
                        alt="Match Educativo: Conecta, comparte y aprende"
                        width={1536}
                        height={1024}
                        className="mx-auto h-auto w-full max-w-xs"
                    />

                    <h1 id="titulo-login" className="mt-4 text-2xl font-semibold">
                        Iniciar sesión
                    </h1>
                </header>

                <div className="grid gap-1">
                    <label htmlFor="login-email">Correo electrónico</label>

                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        value={datos.email}
                        onChange={cambiarCampo}
                        autoComplete="email"
                        maxLength={191}
                        disabled={enviando}
                        className="rounded border bg-white p-2"
                        required
                    />
                </div>

                <div className="grid gap-1">
                    <label htmlFor="login-password">Contraseña</label>

                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        value={datos.password}
                        onChange={cambiarCampo}
                        autoComplete="current-password"
                        disabled={enviando}
                        className="rounded border bg-white p-2"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={enviando}
                    className="rounded bg-[#124277] p-3 text-white disabled:opacity-60"
                >
                    {enviando ? 'Entrando...' : 'Iniciar sesión'}
                </button>

                <p role="status">{mensaje}</p>
                

                <a href="/registro" className="text-center text-[#124277] underline">
                    Crear una cuenta
                </a>
            </form>
        </main>
    );
}