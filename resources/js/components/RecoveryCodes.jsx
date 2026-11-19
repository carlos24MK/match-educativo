import { useEffect, useState } from 'react';
import { enviarFormulario } from '../api.js';

export default function RecoveryCodes() {
    const [password, setPassword] = useState('');
    const [codigos, setCodigos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [disponibles, setDisponibles] = useState(null);

    useEffect(() => {
        const controlador = new AbortController();

        async function cargarEstado() {
            try {
                const respuesta = await fetch('/api/recovery-codes', {
                    credentials: 'same-origin', cache: 'no-store',
                    headers: { Accept: 'application/json' }, signal: controlador.signal,
                });
                if (respuesta.status === 401) {
                    window.location.replace('/login');
                    return;
                }
                if (!respuesta.ok) throw new Error('No se pudo consultar el estado.');
                const resultado = await respuesta.json();
                if (!controlador.signal.aborted) setDisponibles(resultado.data.remaining);
            } catch {
                if (!controlador.signal.aborted) setMensaje('No se pudo consultar el estado de los códigos. Recarga la página.');
            }
        }

        cargarEstado();
        return () => controlador.abort();
    }, []);

    async function generarCodigos(evento) {
        evento.preventDefault();
        setEnviando(true);
        setCodigos([]);
        setMensaje('Generando códigos...');

        try {
            const respuesta = await enviarFormulario('/api/recovery-codes', {
                password,
            });

            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                const nuevos = resultado.data?.recovery_codes;

                if (!Array.isArray(nuevos) || nuevos.length !== 6) {
                    throw new Error('La respuesta no contiene seis códigos.');
                }

                setCodigos(nuevos);
                setDisponibles(6);
                setMensaje(resultado.message);
            } else if (respuesta.status === 422) {
                const errores = Object.values(resultado.errors ?? {}).flat();
                setMensaje(errores.join(' ') || 'Revisa la contraseña.');
            } else if (respuesta.status === 429) {
                setMensaje('Demasiados intentos. Espera un minuto.');
            } else if (respuesta.status === 419) {
                setMensaje('La sesión venció. Recarga la página.');
            } else {
                setMensaje('No se pudieron generar los códigos.');
            }
        } catch {
            setMensaje('No se pudo conectar. Inténtalo de nuevo.');
        } finally {
            setPassword('');
            setEnviando(false);
        }
    }

    function descargarCodigos() {
        if (codigos.length !== 6) return;

        const contenido = 'Match Educativo - Códigos de recuperación\n\n'
            + codigos.join('\n') + '\n';

        const archivo = new Blob([contenido], {
            type: 'text/plain;charset=utf-8',
        });

        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.download = 'match-educativo-recovery-codes.txt';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        // Libera la referencia después de iniciar la descarga.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return (
        <section
            aria-labelledby="titulo-recovery"
            className="tarjeta-cuenta perfil-privacidad"
        >
            <p className="mb-2 inline-flex rounded-full bg-[#d4f0e9] px-2.5 py-1 text-xs font-semibold text-[#0b665d]">Respaldo de acceso</p>
            <h2
                id="titulo-recovery"
                className="text-xl font-bold tracking-tight text-[#10233d]"
            >
                Códigos de recuperación
            </h2>

            {disponibles !== null && (
                <p className="mt-3 flex w-fit items-center gap-2 rounded-xl border border-[#cbe8e3] bg-white px-3 py-2 text-sm font-medium text-[#123659]">
                    Códigos disponibles <strong className="text-lg text-[#0b665d]">{disponibles}</strong>
                </p>
            )}

            <p className="mt-2 text-sm text-[#555555]">
                Generar un nuevo grupo invalida tus códigos anteriores.
                Descarga los nuevos antes de cerrar o recargar esta página.
            </p>

            <form
                onSubmit={generarCodigos}
                className="mt-4 grid gap-3"
            >
                <label htmlFor="recovery-password" className="text-sm font-semibold text-[#123659]">Confirma tu contraseña actual</label>

                <input
                    id="recovery-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                    autoComplete="current-password"
                    disabled={enviando}
                    className="w-full rounded-xl border border-[#ccdae6] bg-white p-2.5 focus-visible:outline-2 focus-visible:outline-[#0b766f]"
                    maxLength={255}
                    required
                />

                <button
                    type="submit"
                    disabled={enviando}
                    className="rounded-xl bg-[#0b766f] px-4 py-2.5 font-semibold text-white hover:bg-[#095c56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b766f] disabled:opacity-60"
                >
                    {enviando ? 'Generando...' : 'Generar seis códigos'}
                </button>
            </form>

            <p role="status" className={mensaje ? 'mt-3 text-sm text-[#555555]' : 'sr-only'}>
                {mensaje}
            </p>

            {codigos.length === 6 && (
                <div className="mt-4">
                    <ol className="grid gap-2">
                        {codigos.map((codigo, indice) => (
                            <li
                                key={codigo}
                                className="rounded-lg border border-[#d9e5ee] bg-white p-3 text-sm"
                            >
                                <span>{indice + 1}. </span>
                                <code className="break-all">{codigo}</code>
                            </li>
                        ))}
                    </ol>

                    <button
                        type="button"
                        onClick={descargarCodigos}
                        className="mt-4 rounded-xl bg-[#123659] px-4 py-2.5 font-semibold text-white hover:bg-[#0b766f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123659]"
                    >
                        Descargar códigos
                    </button>
                </div>
            )}
        </section>
    );
}
