import { useState } from "react";
import { enviarFormulario } from "../api.js";

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
    const [completado, setCompletado] = useState(false);

    function cambiarCampo(evento) {
        const nombreCampo = evento.target.name;
        const valorCampo = evento.target.value;

        setDatos({
            ...datos,
            [nombreCampo]: valorCampo,
        });
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
        <main className="flex min-h-screen items-center justify-center bg-[#F2F4F7] px-4 py-8">
            <form
                onSubmit={recuperar}
                aria-labelledby="titulo-recuperar"
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

                    <h1 id="titulo-recuperar" className="mt-4 text-2xl font-semibold">
                        Recuperar contraseña
                    </h1>
                </header>

                {!completado && (
                    <>
                        <p className="text-sm text-[#555555]">
                            Usa uno de los códigos que guardaste en Configuración → Seguridad.
                        </p>

                        <div className="grid gap-1">
                            <label htmlFor="recuperar-email">Correo electrónico</label>

                            <input
                                id="recuperar-email"
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
                            <label htmlFor="recuperar-code">Código de recuperación</label>

                            <input
                                id="recuperar-code"
                                name="recovery_code"
                                type="text"
                                value={datos.recovery_code}
                                onChange={cambiarCampo}
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={35}
                                disabled={enviando}
                                className="rounded border bg-white p-2"
                                required
                            />
                        </div>

                        <div className="grid gap-1">
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
                                className="rounded border bg-white p-2"
                                required
                            />
                        </div>

                        <div className="grid gap-1">
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
                                className="rounded border bg-white p-2"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={enviando}
                            className="rounded bg-[#124277] p-3 text-white disabled:opacity-60"
                        >
                            {enviando ? 'Comprobando...' : 'Cambiar contraseña'}
                        </button>
                    </>
                )}

                <p role="status">{mensaje}</p>

                <a href="/login" className="text-center text-[#124277] underline">
                    {completado ? 'Iniciar sesión con mi nueva contraseña' : 'Volver al login'}
                </a>
            </form>
        </main>
    );
}

