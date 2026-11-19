import { useEffect, useRef, useState } from 'react';
import { enviarFormulario, enviarFotoPerfil, quitarFotoPerfil } from '../api.js';
import Skeleton from './Skeleton.jsx';

const claseTarjeta = 'tarjeta-cuenta';
const claseCampo = 'w-full rounded-xl border border-[#ccdae6] bg-[#f5f8fb] px-3 py-2.5 text-[#10233d] placeholder:text-slate-500 focus:border-[#0b766f] focus:outline-2 focus:outline-offset-2 focus:outline-[#0b766f]';
const claseBoton = 'rounded-xl bg-[#123659] px-5 py-2.5 font-semibold text-white motion-safe:transition-colors hover:bg-[#0b766f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123659] disabled:cursor-not-allowed disabled:opacity-60';
const claseBotonSecundario = 'rounded-xl border border-[#ccdae6] bg-white px-4 py-2 text-sm font-semibold text-[#123659] hover:bg-[#f5f8fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123659] disabled:cursor-not-allowed disabled:opacity-60';
const formatosFoto = ['image/jpeg', 'image/png', 'image/webp'];
const limiteFoto = 2 * 1024 * 1024;
const semestres = Array.from({ length: 12 }, (_, indice) => indice + 1);

function IconoPerfil({ tipo }) {
    const trazos = {
        perfil: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
        ensena: 'M3 10l9-5 9 5-9 5-9-5z M6 12v5c3 2 9 2 12 0v-5 M21 10v6',
        aprende: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14',
        presentacion: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
        visibilidad: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    };

    return (
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={trazos[tipo]} />
        </svg>
    );
}

function AvatarPerfil({ url, nombre, etiqueta, className }) {
    const [urlFallida, setUrlFallida] = useState(null);
    const iniciales = nombre?.trim().split(/\s+/).slice(0, 2)
        .map(parte => Array.from(parte)[0]).join('').toLocaleUpperCase('es');

    return (
        <span className={'grid shrink-0 place-items-center overflow-hidden bg-[#dbf5f2] font-bold text-[#0b665d] ' + className}>
            {url && url !== urlFallida ? (
                <img src={url} alt={etiqueta} onError={() => setUrlFallida(url)} className="size-full object-cover" />
            ) : (
                <span aria-hidden="true">{iniciales || <IconoPerfil tipo="perfil" />}</span>
            )}
        </span>
    );
}

function EditorFoto({ fotoUrl, nombre, cambiarFoto }) {
    const entrada = useRef(null);
    const [archivo, setArchivo] = useState(null);
    const [vistaPrevia, setVistaPrevia] = useState(null);
    const [operacion, setOperacion] = useState(null);
    const [aviso, setAviso] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!archivo) return;

        const url = URL.createObjectURL(archivo);
        setVistaPrevia(url);
        return () => URL.revokeObjectURL(url);
    }, [archivo]);

    function elegirFoto(evento) {
        const seleccion = evento.target.files?.[0];
        evento.target.value = '';
        if (!seleccion) return;

        setError('');
        setAviso('');
        if ((seleccion.type && !formatosFoto.includes(seleccion.type)) || seleccion.size > limiteFoto) {
            setArchivo(null);
            setError('Selecciona una imagen JPG, PNG o WebP de hasta 2 MB.');
            return;
        }

        setArchivo(seleccion);
    }

    async function guardarFoto(accion) {
        setOperacion(accion);
        setError('');
        setAviso('');

        try {
            const respuesta = accion === 'quitar' ? await quitarFotoPerfil() : await enviarFotoPerfil(archivo);

            if (respuesta.status === 401) {
                window.location.replace('/login');
                return;
            }

            if (respuesta.status === 419) {
                setError('Recarga la página para renovar tu sesión.');
                return;
            }

            if (respuesta.status === 413) {
                setError('La imagen supera el tamaño permitido. Elige una de hasta 2 MB.');
                return;
            }

            if (respuesta.status === 422) {
                const resultado = await respuesta.json();
                setError(resultado.errors?.foto?.[0] || 'Revisa el formato y el tamaño de la imagen.');
                return;
            }

            if (!respuesta.ok) throw new Error('No se pudo actualizar la foto.');

            const { foto_url } = await respuesta.json();
            cambiarFoto(foto_url);
            setArchivo(null);
            setAviso(accion === 'quitar' ? 'Quitaste tu foto de perfil.' : 'Tu foto de perfil se guardó.');
        } catch {
            setError('No se pudo actualizar la foto. Inténtalo de nuevo.');
        } finally {
            setOperacion(null);
        }
    }

    return (
        <section className={claseTarjeta + ' mt-5'} aria-labelledby="foto-perfil-titulo">
            <div className="flex flex-wrap items-center gap-4">
                <AvatarPerfil url={archivo ? vistaPrevia : fotoUrl} nombre={nombre}
                    etiqueta={archivo ? 'Vista previa de tu nueva foto' : 'Tu foto actual'}
                    className="size-20 rounded-2xl text-2xl ring-1 ring-[#cbe8e3]" />
                <div className="min-w-0 flex-[1_1_14rem]">
                    <h2 id="foto-perfil-titulo" className="font-bold text-[#10233d]">Foto de perfil</h2>
                    <p id="foto-perfil-ayuda" className="mt-1 text-sm text-slate-600">
                        Añade una imagen JPG, PNG o WebP de hasta 2 MB. Puedes ver una vista previa antes de guardarla.
                        Si tu perfil está visible, otros estudiantes con sesión iniciada podrán ver la foto guardada.
                    </p>
                    {archivo && <p className="mt-1 text-sm font-medium wrap-anywhere text-[#123659]">{archivo.name}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                    <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        aria-label="Archivo de foto de perfil" aria-describedby="foto-perfil-ayuda"
                        tabIndex={-1} className="sr-only" onChange={elegirFoto} disabled={operacion !== null} />
                    {archivo ? (
                        <>
                            <button type="button" className={claseBoton} disabled={operacion !== null}
                                onClick={() => guardarFoto('guardar')}>
                                {operacion === 'guardar' ? 'Guardando foto…' : 'Guardar foto'}
                            </button>
                            <button type="button" className={claseBotonSecundario} disabled={operacion !== null}
                                onClick={() => { setArchivo(null); setError(''); }}>
                                Cancelar selección
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className={claseBotonSecundario} disabled={operacion !== null}
                                onClick={() => entrada.current?.click()}>
                                {fotoUrl ? 'Cambiar foto' : 'Elegir foto'}
                            </button>
                            {fotoUrl && (
                                <button type="button" className={claseBotonSecundario} disabled={operacion !== null}
                                    onClick={() => guardarFoto('quitar')}>
                                    {operacion === 'quitar' ? 'Quitando foto…' : 'Quitar foto'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
            {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
            <p role="status" className={aviso ? 'mt-3 text-sm font-medium text-green-800' : 'sr-only'}>{aviso}</p>
        </section>
    );
}

function CampoHabilidades({ nombre, titulo, descripcion, ejemplo, habilidades, cambiar }) {
    const [borrador, setBorrador] = useState('');
    const [aviso, setAviso] = useState('');
    const entrada = useRef(null);
    const alLimite = habilidades.length >= 10;
    const colores = nombre === 'ensena' ? 'bg-[#e7f0ff] text-[#244b82]' : 'bg-[#dbf5f2] text-[#0b665d]';

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
                    <p className="w-full rounded-xl border border-dashed border-[#c8d9e7] bg-[#f5f8fb] px-3 py-2.5 text-sm text-slate-600">
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
    const [fotoUrl, setFotoUrl] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [intento, setIntento] = useState(0);
    const perfilCargado = Boolean(datos);

    useEffect(() => {
        if (perfilCargado && window.location.hash === '#habilidades') {
            document.getElementById('habilidades')?.focus();
        }
    }, [perfilCargado]);

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
                if (!controlador.signal.aborted) {
                    setDatos(perfil);
                    setFotoUrl(perfil.foto_url ?? null);
                }
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
            const { presentacion, ensena, aprende, visible_en_busqueda, programa, semestre, preferencias_estudio } = datos;
            const respuesta = await enviarFormulario('/api/perfil', {
                nombre: datos.nombre.trim(), presentacion, ensena, aprende, visible_en_busqueda, programa, semestre, preferencias_estudio,
            });

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
            <div className="perfil-contenido mt-5 grid gap-5" role="status">
                <p className="sr-only">Cargando tu perfil...</p>
                <Skeleton className="perfil-skeleton-resumen" />
                <div className="perfil-datos">
                    <div className={claseTarjeta}>
                        <Skeleton className="skeleton-titulo" />
                        <Skeleton className="skeleton-campo-perfil" />
                    </div>
                    <div className={claseTarjeta}>
                        <Skeleton className="skeleton-titulo" />
                        <Skeleton className="skeleton-texto" />
                    </div>
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
        <div className="perfil-contenido mt-5">
            <section className="perfil-resumen flex flex-wrap items-center justify-between gap-4" aria-labelledby="perfil-resumen-titulo">
                <div className="relative flex min-w-0 items-center gap-4">
                    <AvatarPerfil url={fotoUrl} nombre={datos.nombre} etiqueta="" className="size-14 rounded-2xl text-xl" />
                    <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs font-semibold tracking-widest text-[#b8eee5] uppercase">Tu espacio personal</p>
                        <h2 id="perfil-resumen-titulo" className="text-xl font-bold tracking-tight text-white sm:text-2xl">Tu perfil de aprendizaje</h2>
                        <p className="mt-1 max-w-xl text-sm text-[#d6f0f2]">Cuenta quién eres, qué sabes y qué quieres aprender.</p>
                    </div>
                </div>
                <dl className="relative flex flex-wrap gap-2 text-sm text-blue-100">
                    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                        <dt>Para enseñar</dt>
                        <dd className="rounded-md bg-white/15 px-2 py-0.5 font-bold text-white">{datos.ensena.length}</dd>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
                        <dt>Para aprender</dt>
                        <dd className="rounded-md bg-white/15 px-2 py-0.5 font-bold text-white">{datos.aprende.length}</dd>
                    </div>
                </dl>
            </section>

            <EditorFoto fotoUrl={fotoUrl} nombre={datos.nombre} cambiarFoto={setFotoUrl} />

            <form onSubmit={guardarPerfil} className="mt-5">
                <fieldset disabled={guardando} className="grid min-w-0 gap-5">
                    <div className="perfil-datos">
                        <section className={claseTarjeta}>
                            <label htmlFor="perfil-nombre" className="block text-sm font-semibold text-slate-800">Nombre visible</label>
                            <input id="perfil-nombre" autoComplete="name" required maxLength={191} value={datos.nombre}
                                onChange={evento => actualizar('nombre', evento.target.value)}
                                className={'mb-4 mt-2 ' + claseCampo} />
                            <label htmlFor="presentacion" className="flex items-center gap-2.5 font-bold text-[#10233d]">
                                <span className="grid size-9 place-items-center rounded-xl bg-[#e7f0ff] text-[#244b82]">
                                    <IconoPerfil tipo="presentacion" />
                                </span>
                                Presentación
                            </label>
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

                        <section className={claseTarjeta + ' perfil-privacidad flex flex-col'} aria-labelledby="visibilidad-perfil-titulo">
                            <h2 id="visibilidad-perfil-titulo" className="flex items-center gap-2.5 font-bold text-[#10233d]">
                                <span className="grid size-9 place-items-center rounded-xl bg-[#d4f0e9] text-[#0b665d]">
                                    <IconoPerfil tipo="visibilidad" />
                                </span>
                                Visibilidad del perfil
                            </h2>
                            <label htmlFor="visible-en-busqueda" className="mt-3 flex items-start gap-3 rounded-xl border border-[#cbe8e3] bg-white p-3 text-sm font-semibold text-slate-800">
                                <input id="visible-en-busqueda" name="visible_en_busqueda" type="checkbox"
                                    checked={datos.visible_en_busqueda === true}
                                    onChange={evento => actualizar('visible_en_busqueda', evento.target.checked)}
                                    aria-describedby="visibilidad-perfil-ayuda"
                                    className="mt-0.5 size-4 shrink-0 accent-[#0b766f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b766f]" />
                                Aparecer en Buscar coincidencias
                            </label>
                            <p id="visibilidad-perfil-ayuda" className="mt-2 text-sm text-slate-600">
                                Al activar esta opción y guardar, otros usuarios podrán ver los datos de tu perfil y usar el filtro para saber si tienen horarios en común contigo. Tu correo queda privado.
                            </p>
                        </section>
                    </div>

                    <section className={claseTarjeta} aria-labelledby="datos-estudio-titulo">
                        <h2 id="datos-estudio-titulo" className="font-bold text-[#10233d]">Estudios y preferencias</h2>
                        <p className="mt-1 text-sm text-slate-600">Estos datos son opcionales. Completa lo que quieras compartir.</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <div>
                                <label htmlFor="perfil-programa" className="block text-sm font-semibold text-slate-800">Programa o carrera</label>
                                <input id="perfil-programa" name="programa" type="text" maxLength={100}
                                    value={datos.programa ?? ''} onChange={evento => actualizar('programa', evento.target.value)}
                                    placeholder="Ej. Ingeniería de sistemas" className={'mt-2 ' + claseCampo} />
                            </div>
                            <div>
                                <label htmlFor="perfil-semestre" className="block text-sm font-semibold text-slate-800">Semestre</label>
                                <select id="perfil-semestre" name="semestre" value={datos.semestre ?? ''}
                                    onChange={evento => actualizar('semestre', evento.target.value ? Number(evento.target.value) : null)}
                                    className={'mt-2 ' + claseCampo}>
                                    <option value="">Sin especificar</option>
                                    {semestres.map(semestre => <option key={semestre} value={semestre}>{semestre}</option>)}
                                </select>
                            </div>
                        </div>
                        <label htmlFor="preferencias-estudio" className="mt-4 block text-sm font-semibold text-slate-800">¿Cómo prefieres estudiar?</label>
                        <textarea id="preferencias-estudio" name="preferencias_estudio" rows={2} maxLength={160}
                            value={datos.preferencias_estudio ?? ''}
                            onChange={evento => actualizar('preferencias_estudio', evento.target.value)}
                            placeholder="Ej. Sesiones cortas por videollamada para resolver ejercicios."
                            aria-describedby="preferencias-estudio-contador" className={'mt-2 resize-y ' + claseCampo} />
                        <p id="preferencias-estudio-contador" className="mt-1 text-right text-xs text-slate-600">
                            {datos.preferencias_estudio?.length ?? 0}/160 caracteres
                        </p>
                    </section>

                    <section id="habilidades" tabIndex={-1} className="scroll-mt-4 rounded-xl focus-visible:outline-2 focus-visible:outline-[#0b615a]" aria-labelledby="perfil-habilidades-titulo">
                        <h2 id="perfil-habilidades-titulo" className="mb-3 text-xl font-bold">Mis habilidades</h2>
                        <div className="perfil-habilidades">
                            <CampoHabilidades nombre="ensena" titulo="Puedo enseñar" descripcion="Temas que puedes compartir con otras personas."
                                ejemplo="Ej. Matemáticas" habilidades={datos.ensena} cambiar={valor => actualizar('ensena', valor)} />
                            <CampoHabilidades nombre="aprende" titulo="Quiero aprender" descripcion="Temas en los que quieres encontrar apoyo."
                                ejemplo="Ej. Programación" habilidades={datos.aprende} cambiar={valor => actualizar('aprende', valor)} />
                        </div>
                    </section>
                </fieldset>

                {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d9e5ee] bg-white px-4 py-3 shadow-sm">
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
