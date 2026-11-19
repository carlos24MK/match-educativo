import { useState } from "react";
import { enviarFormulario } from "../api.js";
import AuthLayout from './AuthLayout.jsx';

const camposIniciales = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
};

export default function Registro() {

    const [datos, setDatos] = useState(camposIniciales);
    const [mensaje, setMensaje] = useState('');
    const [registroExitoso, setRegistroExitoso] = useState(false);
    const [enviando, setEnviando] = useState(false);

    function cambiarCampo(evento) {
        const nombreCampo = evento.target.name;
        const valorCampo = evento.target.value;

        setDatos({
            ...datos,
            [nombreCampo]: valorCampo,
        });
    }

    async function registrar(evento) {

        evento.preventDefault();
        setEnviando(true);
        setRegistroExitoso(false);
        setMensaje('Guardando...');

        try {
           const respuesta = await enviarFormulario('/api/registrar', datos);

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                setRegistroExitoso(true);
                setMensaje(resultado.message);
                setDatos(camposIniciales);
            } else if (respuesta.status === 422) {
                // Agrupa los errores de validación de Laravel.
                const errores = Object.values(
                    resultado.errors ?? {}
                ).flat();

                setMensaje(
                    errores.join(' ') || 'Revisa los datos enviados.'
                );
            } else {
                setMensaje('No se pudo completar el registro.');
            }
        } catch {
            setMensaje(
                'No se pudo completar el registro. Inténtalo de nuevo en unos minutos.'
            );
        } finally {
            setEnviando(false);
        }
    }

    return (
        <AuthLayout tituloId="titulo-registro" titulo="Crear cuenta" categoria="Únete a la comunidad"
            descripcion="Crea tu perfil para compartir tus habilidades y encontrar compañeros de estudio.">
            <form
                onSubmit={registrar}
                aria-labelledby="titulo-registro"
                className="auth-form"
            >
                <div className="auth-field">
                    <label htmlFor="name">Nombre</label>

                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={datos.name}
                        onChange={cambiarCampo}
                        maxLength={191}
                        autoComplete="name"
                        disabled={enviando}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="email">Correo electrónico</label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={datos.email}
                        onChange={cambiarCampo}
                        maxLength={191}
                        autoComplete="email"
                        disabled={enviando}
                        required
                    />
                </div>

                <div className="auth-pair">
                    <div className="auth-field">
                        <label htmlFor="password">Contraseña</label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={datos.password}
                            onChange={cambiarCampo}
                            minLength={8}
                            maxLength={255}
                            autoComplete="new-password"
                            disabled={enviando}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="password_confirmation">Confirmar contraseña</label>

                        <input
                            id="password_confirmation"
                            name="password_confirmation"
                            type="password"
                            value={datos.password_confirmation}
                            onChange={cambiarCampo}
                            minLength={8}
                            maxLength={255}
                            autoComplete="new-password"
                            disabled={enviando}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={enviando}
                    className="auth-button"
                >
                    {enviando ? 'Guardando...' : 'Registrarme'}
                </button>

                <p role="status" className={`auth-status empty:sr-only ${!enviando && !registroExitoso ? 'auth-status--error' : ''}`}>{mensaje}</p>
                <p className="auth-form-footer">
                    ¿Ya tienes una cuenta?{' '}
                    <a href="/login" className="auth-link">
                        Inicia sesión
                    </a>
                </p>
            </form>
        </AuthLayout>
    );
}
