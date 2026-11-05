import { useEffect, useRef, useState } from 'react';
import { enviarFormulario } from '../api.js';
import Skeleton from './Skeleton.jsx';

const claseTarjeta = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const claseCampo = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-[#16778b] focus:outline-2 focus:outline-offset-2 focus:outline-[#16778b]';
const claseBoton = 'rounded-xl bg-[#124277] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#0d325b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#124277] disabled:cursor-not-allowed disabled:opacity-60';

function IconoPerfil({ tipo }) {
    const trazos = {
        perfil: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
        ensena: 'M3 10l9-5 9 5-9 5-9-5z M6 12v5c3 2 9 2 12 0v-5 M21 10v6',
        aprende: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14',
    };

    return (
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={trazos[tipo]} />
        </svg>
    );
}

function CampoHabilidades({ nombre, titulo, descripcion, ejemplo, habilidades, cambiar }) {
    const [borrador, setBorrador] = useState('');
    const [aviso, setAviso] = useState('');
    const entrada = useRef(null);
    const alLimite = habilidades.length >= 10;
    const colores = nombre === 'ensena' ? 'bg-blue-50 text-[#124277]' : 'bg-cyan-50 text-[#125b69]';

    function agregar() {
        const habilidad = borrador.trim();
        if (!habilidad || alLimite) return;

        if (habilidades.some(actual => actual.toLowerCase() === habilidad.toLowerCase())) {
            setAviso('Esa habilidad ya está en esta lista.');
            entrada.current?.focus();
            return;
        }

        cambiar([...habilidades, habilidad]);
        setBorrador('');
        setAviso('');
        entrada.current?.focus();
    }

    return (
        <section className={claseTarjeta} aria-labelledby={nombre + '-titulo'}>
            <div className="flex items-start gap-3">
                <span className={'grid size-10 shrink-0 place-items-center rounded-xl ' + colores}>
                    <IconoPerfil tipo={nombre} />
                </span>
                <div>
                    <h2 id={nombre + '-titulo'} className="font-bold text-[#124277]">{titulo}</h2>
                    <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
                </div>
            </div>

            <div className="mt-5 flex min-h-11 items-start">
                {habilidades.length ? (
                    <ul className="flex flex-wrap gap-2" aria-label={titulo}>
                        {habilidades.map(habilidad => (
                            <li key={habilidad} className={'inline-flex max-w-full items-center gap-1 rounded-lg py-1 pr-1 pl-2.5 text-sm font-medium ' + colores}>
                                <span className="min-w-0 wrap-anywhere">{habilidad}</span>
                                <button type="button" aria-label={'Quitar ' + habilidad}
                                    className="grid size-7 shrink-0 place-items-center rounded-md text-lg hover:bg-slate-200 focus-visible:outline-2"
                                    onClick={() => {
                                        cambiar(habilidades.filter(actual => actual !== habilidad));
                                        setAviso('');
                                        entrada.current?.focus();
                                    }}>
                                    <span aria-hidden="true">×</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
                        Aún no has añadido habilidades.
                    </p>
                )}
            </div>

            <label htmlFor={nombre} className="mt-3 block text-sm font-semibold text-slate-800">Añadir habilidad</label>
            <div className="mt-2 flex flex-wrap gap-2">
                <input id={nombre} ref={entrada} type="text" autoComplete="off" maxLength={60}
                    value={borrador} placeholder={ejemplo} aria-describedby={nombre + '-ayuda'}
                    className={'min-w-32 flex-1 ' + claseCampo} disabled={alLimite}
                    onChange={evento => { setBorrador(evento.target.value); setAviso(''); }}
                    onKeyDown={evento => {
                        if (evento.key === 'Enter' && !evento.nativeEvent.isComposing) {
                            evento.preventDefault();
                            agregar();
                        }
                    }} />
                <button type="button" onClick={agregar} disabled={!borrador.trim() || alLimite}
                    className="rounded-xl border border-[#124277] px-3 py-2.5 text-sm font-semibold text-[#124277] hover:bg-blue-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50">
                    Añadir
                </button>
            </div>
            <div id={nombre + '-ayuda'} className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-600">
                <span>{alLimite ? 'Has llegado al máximo de habilidades.' : 'Pulsa Enter o Añadir para incluirla.'}</span>
                <span>{habilidades.length}/10</span>
            </div>
            {aviso && <p role="status" className="mt-2 text-sm font-medium text-red-700">{aviso}</p>}
        </section>
    );
}

export default function Perfil() {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        const controlador = new AbortController();

        async function cargarPerfil() {
            try {
                const respuesta = await fetch('/api/perfil', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                    signal: controlador.signal,
                });

                if (respuesta.status === 401) {
                    window.location.replace('/login');
                    return;
                }

                if (!respuesta.ok) throw new Error('No se pudo cargar el perfil.');

                const perfil = await respuesta.json();
                if (!controlador.signal.aborted) setDatos(perfil);
            } catch {
                if (!controlador.signal.aborted) {
                    setError('No se pudo cargar tu perfil. Inténtalo de nuevo.');
                }
            } finally {
                if (!controlador.signal.aborted) setCargando(false);
            }
        }

        cargarPerfil();
        return () => controlador.abort();
    }, [intento]);

    async function guardarPerfil(evento) {
        evento.preventDefault();
        setGuardando(true);
        setError('');
        setMensaje('');

        try {
            const respuesta = await enviarFormulario('/api/perfil', datos);

            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }

            if (respuesta.status === 419) {
                setError('Recarga la página para renovar tu sesión.');
                return;
            }

            if (respuesta.status === 422) {
                const resultado = await respuesta.json();
                setError(Object.values(resultado.errors ?? {}).flat().join(' ') || 'Revisa los datos del perfil.');
                return;
            }

            if (!respuesta.ok) throw new Error('No se pudo guardar el perfil.');

            setDatos(await respuesta.json());
            setMensaje('Tu perfil se guardó correctamente.');
        } catch {
            setError('No se pudo guardar tu perfil. Inténtalo de nuevo.');
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <div className="perfil-contenido mt-6 grid gap-5" role="status">
                <p className="sr-only">Cargando tu perfil...</p>
                <Skeleton className="perfil-skeleton-resumen" />
                <div className={claseTarjeta}>
                    <Skeleton className="skeleton-titulo" />
                    <Skeleton className="skeleton-campo-perfil" />
                </div>
                <div className="perfil-habilidades">
                    {[0, 1].map(indice => (
                        <div key={indice} className={claseTarjeta}>
                            <Skeleton className="skeleton-titulo" />
                            <Skeleton className="skeleton-campo-perfil" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!datos) {
        return (
            <section className="mt-6 max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
                <p role="alert" className="text-red-700">{error}</p>
                <button
                    type="button"
                    className="mt-4 rounded bg-[#124277] px-4 py-2 text-white"
                    onClick={() => {
                        setError('');
                        setCargando(true);
                        setIntento(anterior => anterior + 1);
                    }}
                >
                    Volver a intentar
                </button>
            </section>
        );
    }

    function actualizar(campo, valor) {
        setDatos(anterior => ({ ...anterior, [campo]: valor }));
        setMensaje('');
    }

    return (
        <div className="perfil-contenido mt-6">
            <section className="perfil-resumen" aria-labelledby="perfil-resumen-titulo">
                <div className="relative flex flex-wrap items-center gap-5">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15 text-white">
                        <IconoPerfil tipo="perfil" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="perfil-resumen-titulo" className="text-xl font-bold text-white sm:text-2xl">Tu perfil de aprendizaje</h2>
                        <p className="mt-1 max-w-xl text-sm text-blue-100">Cuenta quién eres, qué sabes y qué quieres aprender.</p>
                    </div>
                </div>
                <dl className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 pt-4 text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                        <dt>Para enseñar</dt>
                        <dd className="rounded-md bg-white/15 px-2 py-0.5 font-bold text-white">{datos.ensena.length}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                        <dt>Para aprender</dt>
                        <dd className="rounded-md bg-white/15 px-2 py-0.5 font-bold text-white">{datos.aprende.length}</dd>
                    </div>
                </dl>
            </section>

            <form onSubmit={guardarPerfil} className="mt-5">
                <fieldset disabled={guardando} className="grid min-w-0 gap-5">
                    <section className={claseTarjeta}>
                        <label htmlFor="presentacion" className="block font-bold text-[#124277]">Presentación</label>
                        <p id="presentacion-ayuda" className="mt-1 text-sm text-slate-600">Comparte tus intereses o cómo te gusta estudiar.</p>
                        <textarea id="presentacion" name="presentacion" rows={3} maxLength={500}
                            aria-describedby="presentacion-ayuda presentacion-contador"
                            placeholder="Por ejemplo: Me gusta aprender en grupo y compartir apuntes."
                            value={datos.presentacion} onChange={evento => actualizar('presentacion', evento.target.value)}
                            className={'mt-3 min-h-24 resize-y ' + claseCampo} />
                        <p id="presentacion-contador" className="mt-1 text-right text-xs text-slate-600">
                            {datos.presentacion.length}/500 caracteres
                        </p>
                    </section>

                    <div className="perfil-habilidades">
                        <CampoHabilidades nombre="ensena" titulo="Puedo enseñar" descripcion="Temas que puedes compartir con otros estudiantes."
                            ejemplo="Ej. Matemáticas" habilidades={datos.ensena} cambiar={valor => actualizar('ensena', valor)} />
                        <CampoHabilidades nombre="aprende" titulo="Quiero aprender" descripcion="Temas en los que quieres encontrar apoyo."
                            ejemplo="Ej. Programación" habilidades={datos.aprende} cambiar={valor => actualizar('aprende', valor)} />
                    </div>
                </fieldset>

                {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-4">
                    <p role="status" className={mensaje ? 'text-sm font-medium text-green-800' : 'text-sm text-slate-600'}>
                        {mensaje || 'Guarda tu perfil para conservar los cambios.'}
                    </p>
                    <button type="submit" disabled={guardando} className={claseBoton}>
                        {guardando ? 'Guardando…' : 'Guardar perfil'}
                    </button>
                </div>
            </form>
        </div>
    );
}
