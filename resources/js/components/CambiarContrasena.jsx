import { useState } from 'react';
import { enviarFormulario } from '../api.js';

const inicial = { current_password: '', password: '', password_confirmation: '' };
const campos = [
    { nombre: 'current_password', titulo: 'Contraseña actual', autoComplete: 'current-password' },
    { nombre: 'password', titulo: 'Nueva contraseña', autoComplete: 'new-password', minLength: 8 },
    { nombre: 'password_confirmation', titulo: 'Confirma la nueva contraseña', autoComplete: 'new-password', minLength: 8 },
];

export default function CambiarContrasena() {
    const [datos, setDatos] = useState(inicial);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    async function cambiarContrasena(evento) {
        evento.preventDefault();
        setError('');

        if (datos.password !== datos.password_confirmation) {
            setError('La nueva contraseña y su confirmación deben coincidir.');
            return;
        }

        setGuardando(true);
        try {
            const respuesta = await enviarFormulario('/api/configuracion/contrasena', datos);
            if (respuesta.ok) {
                window.location.replace('/login?contrasena=actualizada');
                return;
            }

            if (respuesta.status === 401 || respuesta.status === 419) {
                setError('Tu sesión venció. Recarga la página y vuelve a iniciar sesión.');
            } else if (respuesta.status === 422) {
                const resultado = await respuesta.json();
                setError(Object.values(resultado.errors ?? {}).flat().join(' ') || 'Revisa los datos del formulario.');
            } else if (respuesta.status === 429) {
                setError('Hiciste demasiados intentos. Espera un minuto antes de probar otra vez.');
            } else {
                setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
            }
        } catch {
            setError('No se pudo conectar con el servidor. Inténtalo de nuevo.');
        } finally {
            setDatos(inicial);
            setGuardando(false);
        }
    }

    return (
        <section aria-labelledby="titulo-cambiar-contrasena" className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 id="titulo-cambiar-contrasena" className="text-xl font-bold text-[#124277]">Cambiar contraseña</h2>
            <p className="mt-2 text-sm text-slate-600">
                Usa al menos ocho caracteres. Al guardar, tendrás que iniciar sesión con tu nueva contraseña.
            </p>

            <form onSubmit={cambiarContrasena} className="mt-5">
                <fieldset disabled={guardando} className="grid gap-4">
                    {campos.map(({ nombre, titulo, autoComplete, minLength }) => (
                        <div key={nombre} className="grid gap-1">
                            <label htmlFor={'cambio-' + nombre} className="text-sm font-semibold text-[#124277]">{titulo}</label>
                            <input
                                id={'cambio-' + nombre}
                                type="password"
                                name={nombre}
                                value={datos[nombre]}
                                onChange={evento => setDatos({ ...datos, [nombre]: evento.target.value })}
                                autoComplete={autoComplete}
                                minLength={minLength}
                                maxLength={255}
                                required
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 focus-visible:outline-2 focus-visible:outline-cyan-700"
                            />
                        </div>
                    ))}
                    <button type="submit" className="justify-self-start rounded-xl bg-[#124277] px-5 py-2.5 font-semibold text-white disabled:opacity-60">
                        {guardando ? 'Guardando…' : 'Actualizar contraseña'}
                    </button>
                </fieldset>
                {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
            </form>
        </section>
    );
}
