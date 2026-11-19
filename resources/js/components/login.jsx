import { useState } from "react";
import { enviarFormulario } from "../api.js";
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
    const [datos, setDatos] = useState({ email: '', password: '' });
    const [intentoRealizado, setIntentoRealizado] = useState(false);
    const [mensaje, setMensaje] = useState(() => (
        new URLSearchParams(window.location.search).get('contrasena') === 'actualizada'
            ? 'Contraseña actualizada. Inicia sesión con la nueva contraseña.'
            : ''
    ));
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
        setIntentoRealizado(true);
        setMensaje('Iniciando sesión...');

        try {
            const respuesta = await enviarFormulario('/api/login', datos);
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                // Comprueba que Laravel reconoce la sesión en otra petición.
                const sesion = await fetch('/api/user', {
                    credentials: 'same-origin',
                    cache: 'no-store',
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
            } else if (respuesta.status === 419) {
                setMensaje('La sesión venció. Recarga la página.');
            } else {
                setMensaje('No se pudo iniciar sesión.');
            }
        } catch {
            setMensaje('No se pudo iniciar sesión. Inténtalo de nuevo en unos minutos.');
        } finally {
            setDatos({ ...datos, password: '' });
            setEnviando(false);
        }
    }

    return (
        <AuthLayout tituloId="titulo-login" titulo="Iniciar sesión" categoria="Tu espacio de estudio"
            descripcion="Vuelve a tus conversaciones, habilidades y conexiones de estudio.">
            <form
                onSubmit={iniciarSesion}
                aria-labelledby="titulo-login"
                className="auth-form"
            >
                <div className="auth-field">
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
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="login-password">Contraseña</label>

                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        value={datos.password}
                        onChange={cambiarCampo}
                        autoComplete="current-password"
                        maxLength={255}
                        disabled={enviando}
                        required
                    />
                </div>

                <a href="/recuperar-contrasena" className="auth-link justify-self-end text-sm">
                    ¿Olvidaste tu contraseña?
                </a>

                <button
                    type="submit"
                    disabled={enviando}
                    className="auth-button"
                >
                    {enviando ? 'Entrando...' : 'Iniciar sesión'}
                </button>

                <p role="status" className={`auth-status empty:sr-only ${intentoRealizado && !enviando ? 'auth-status--error' : ''}`}>{mensaje}</p>

                <p className="auth-form-footer">
                    ¿Aún no tienes cuenta?{' '}
                    <a href="/registro" className="auth-link">Crear una cuenta</a>
                </p>
            </form>
        </AuthLayout>
    );
}
