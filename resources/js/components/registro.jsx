import { useState } from "react";
import { enviarFormulario } from "../api.js";
const camposIniciales = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
};

export default function Registro() {

    const [datos, setDatos] = useState(camposIniciales);
    const [mensaje, setMensaje] = useState('');
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
        setMensaje('Guardando...');

        try {
           const respuesta = await enviarFormulario('/api/registrar', datos);

            const resultado = await respuesta.json();

            if (respuesta.ok) {
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
                'No se pudo completar la petición. Revisa Laravel.'
            );
        } finally {
            setEnviando(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F2F4F7] px-4 py-8">
            <form
                onSubmit={registrar}
                aria-labelledby="titulo-registro"
               className="grid w-full max-w-md gap-4 rounded-2xl bg-[#F7F7F7] p-6 shadow-lg sm:p-8"
            >

                <header className="mb-2 text-center">
                    <img
                        src="/images/logo-match-educativo.webp"
                        alt="Match Educativo: Conecta, comparte y aprende"
                        width={1536}
                        height={1024}
                        className="mx-auto h-auto w-full max-w-xs"
                    />
                </header>


                <div className="grid gap-1">
                    <label htmlFor="name">Nombre</label>

                    <input
                        className="rounded border bg-white p-2"
                        id="name"
                        name="name"
                        type="text"
                        value={datos.name}
                        onChange={cambiarCampo}
                        maxLength={191}
                        autoComplete="name"
                        required
                    />
                </div>

                <div className="grid gap-1">
                    <label htmlFor="email">Correo electrónico</label>

                    <input
                        className="rounded border bg-white p-2"
                        id="email"
                        name="email"
                        type="email"
                        value={datos.email}
                        onChange={cambiarCampo}
                        maxLength={191}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="grid gap-1">
                    <label htmlFor="password">Contraseña</label>

                    <input
                        className="rounded border bg-white p-2"
                        id="password"
                        name="password"
                        type="password"
                        value={datos.password}
                        onChange={cambiarCampo}
                        minLength={8}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="grid gap-1">
                    <label htmlFor="password_confirmation">
                        Confirmar contraseña
                    </label>

                    <input
                        className="rounded border bg-white p-2"
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        value={datos.password_confirmation}
                        onChange={cambiarCampo}
                        minLength={8}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={enviando}
                    className="mt-4 rounded bg-[#124277] p-3 text-white"
                >
                    {enviando ? 'Guardando...' : 'Registrarme'}
                </button>

                <p role="status">{mensaje}</p>
                <p className="text-center text-sm text-[#555555]">
    ¿Ya tienes una cuenta?{' '}
    <a href="/login" className="font-semibold text-[#124277] underline">
        Inicia sesión
    </a>
</p>
            </form>
        </main>
    );
}