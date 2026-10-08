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
            className="mt-6 rounded-2xl bg-white p-6 shadow-sm"
        >
            <h2
                id="titulo-recovery"
                className="text-xl font-semibold text-[#124277]"
            >
                Códigos de recuperación
            </h2>

            {disponibles !== null && <p className="mt-2 font-medium text-[#1E3A5F]">Códigos disponibles: {disponibles}</p>}

            <p className="mt-2 text-sm text-[#555555]">
                Generar un nuevo grupo invalida tus códigos anteriores.
                Descarga los nuevos antes de cerrar o recargar esta página.
            </p>

            <form
                onSubmit={generarCodigos}
                className="mt-4 grid max-w-md gap-3"
            >
                <label htmlFor="recovery-password">Confirma tu contraseña actual</label>

                <input
                    id="recovery-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                    autoComplete="current-password"
                    disabled={enviando}
                    className="rounded border bg-white p-2"
                    maxLength={255}
                    required
                />

                <button
                    type="submit"
                    disabled={enviando}
                    className="rounded bg-[#124277] p-3 text-white disabled:opacity-60"
                >
                    {enviando ? 'Generando...' : 'Generar seis códigos'}
                </button>
            </form>

            <p role="status" className="mt-3 text-sm text-[#555555]">
                {mensaje}
            </p>

            {codigos.length === 6 && (
                <div className="mt-4">
                    <ol className="grid gap-2">
                        {codigos.map((codigo, indice) => (
                            <li
                                key={codigo}
                                className="rounded bg-[#F2F4F7] p-3"
                            >
                                <span>{indice + 1}. </span>
                                <code className="break-all">{codigo}</code>
                            </li>
                        ))}
                    </ol>

                    <button
                        type="button"
                        onClick={descargarCodigos}
                        className="mt-4 rounded bg-[#124277] p-3 text-white"
                    >
                        Descargar códigos
                    </button>
                </div>
            )}
        </section>
    );
}
