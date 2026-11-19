import { useState } from "react";
import { enviarFormulario } from "../api.js";
import AuthLayout from './AuthLayout.jsx';

const camposIniciales = {
    email: '',
    recovery_code: '',
    password: '',
    password_confirmation: '',
};

export default function RecuperarContrasena() {
    const [datos, setDatos] = useState(camposIniciales);
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [solicitando, setSolicitando] = useState(false);
    const [completado, setCompletado] = useState(false);

    function cambiarCampo(evento) {
        const nombreCampo = evento.target.name;
        const valorCampo = evento.target.value;

        setDatos({
            ...datos,
            [nombreCampo]: valorCampo,
        });
    }

    async function solicitarCodigo(evento) {
        if (!evento.currentTarget.form.elements.email.reportValidity()) return;

        setSolicitando(true);
        setMensaje('Solicitando código…');
        try {
            const respuesta = await enviarFormulario('/api/solicitar-codigo-recuperacion', {
                email: datos.email.trim(),
            });
            const resultado = await respuesta.json();
            setMensaje(respuesta.status === 429
                ? 'Espera un minuto antes de pedir otro código.'
                : resultado.message ?? 'No se pudo solicitar el código.');
        } catch {
            setMensaje('No se pudo conectar con el servidor.');
        } finally {
            setSolicitando(false);
        }
    }

    async function recuperar(evento) {
        evento.preventDefault();
        setEnviando(true);
        setMensaje('Comprobando el código...');

        try {
            const respuesta = await enviarFormulario('/api/recuperar-contrasena', {
                ...datos,
                email: datos.email.trim(),
                recovery_code: datos.recovery_code.trim().toUpperCase(),
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                setMensaje(resultado.message);
                setDatos(camposIniciales);
                setCompletado(true);
            } else if (respuesta.status === 422) {
                const errores = Object.values(resultado.errors ?? {}).flat();
                setMensaje(errores.join(' ') || 'Revisa los datos enviados.');
            } else if (respuesta.status === 429) {
                setMensaje('Demasiados intentos. Espera un minuto.');
            } else if (respuesta.status === 419) {
                setMensaje('La sesión venció. Recarga la página.');
            } else {
                setMensaje('No se pudo recuperar la contraseña.');
            }
        } catch {
            setMensaje('No se pudo conectar con el servidor.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        <AuthLayout tituloId="titulo-recuperar" titulo="Recuperar contraseña" categoria="Seguridad de la cuenta"
            descripcion={completado
                ? 'Ya puedes volver a entrar a tu cuenta.'
                : 'Pide un código temporal por correo o usa uno de tus códigos de respaldo.'}
        >
            <form
                onSubmit={recuperar}
                aria-labelledby="titulo-recuperar"
                className="auth-form"
            >
                {!completado && (
                    <>
                        <div className="auth-field">
                            <label htmlFor="recuperar-email">Correo electrónico</label>

                            <input
                                id="recuperar-email"
                                name="email"
                                type="email"
                                value={datos.email}
                                onChange={cambiarCampo}
                                autoComplete="email"
                                maxLength={191}
                                disabled={enviando || solicitando}
                                required
                            />
                            <button type="button" className="auth-link self-start" onClick={solicitarCodigo}
                                disabled={enviando || solicitando}>
                                {solicitando ? 'Solicitando…' : 'Enviarme un código por correo'}
                            </button>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="recuperar-code">Código de recuperación</label>

                            <input
                                id="recuperar-code"
                                name="recovery_code"
                                type="text"
                                value={datos.recovery_code}
                                onChange={cambiarCampo}
                                autoComplete="one-time-code"
                                spellCheck={false}
                                maxLength={35}
                                disabled={enviando}
                                required
                            />
                        </div>

                        <div className="auth-pair">
                            <div className="auth-field">
                                <label htmlFor="recuperar-password">Contraseña nueva</label>

                                <input
                                    id="recuperar-password"
                                    name="password"
                                    type="password"
                                    value={datos.password}
                                    onChange={cambiarCampo}
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={255}
                                    disabled={enviando}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="recuperar-confirmation">Confirmar contraseña nueva</label>

                                <input
                                    id="recuperar-confirmation"
                                    name="password_confirmation"
                                    type="password"
                                    value={datos.password_confirmation}
                                    onChange={cambiarCampo}
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={255}
                                    disabled={enviando}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={enviando || solicitando}
                            className="auth-button"
                        >
                            {enviando ? 'Comprobando...' : 'Cambiar contraseña'}
                        </button>
                    </>
                )}

                <p role="status" className="auth-status empty:sr-only">{mensaje}</p>

                <p className="auth-form-footer">
                    <a href="/login" className="auth-link">
                        {completado ? 'Iniciar sesión con mi nueva contraseña' : 'Volver al login'}
                    </a>
                </p>
            </form>
        </AuthLayout>
    );
}

