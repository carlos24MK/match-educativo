import { useEffect, useRef, useState } from 'react';
import {
    AvatarSocial, botonSocial, botonSocialSecundario, CargaSocial, consultarSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, IconoSocial, PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

function Conversacion({ id, tiempoRealConectado, llamadas }) {
    const ruta = '/api/matches/' + id + '/mensajes';
    const consulta = useConsultaSocial(ruta);
    const [texto, setTexto] = useState('');
    const [mensajesExtra, setMensajesExtra] = useState([]);
    const [hayAnteriores, setHayAnteriores] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');
    const [aviso, setAviso] = useState('');
    const [escribiendo, setEscribiendo] = useState(false);
    const lista = useRef(null);
    const peticionAnteriores = useRef(null);
    const frecuenciaConsulta = useRef(3000);
    const escrituraPropia = useRef({ activa: false, ultimoAviso: 0, envio: Promise.resolve() });

    // Combina el lote inicial con los mensajes anteriores y los enviados desde esta pantalla.
    const porId = new Map([...mensajesExtra, ...(consulta.datos?.data ?? [])].map(mensaje => [mensaje.id, mensaje]));
    const mensajes = [...porId.values()].sort((a, b) => a.id - b.id);
    const ultimoMensaje = mensajes.at(-1)?.id;

    useEffect(() => {
        frecuenciaConsulta.current = tiempoRealConectado ? 6000 : 3000;
    }, [tiempoRealConectado]);

    useEffect(() => {
        if (!consulta.datos) return;
        const controlador = new AbortController();
        let cursor = consulta.datos.data.at(-1)?.id ?? 0;
        let consultando = false;
        let pendiente = false;
        let relojConsulta;
        let relojEscritura;

        function mostrarEscritura(activa) {
            window.clearTimeout(relojEscritura);
            setEscribiendo(activa);
            if (activa) {
                relojEscritura = window.setTimeout(() => setEscribiendo(false), 6000);
            }
        }

        async function buscarNuevos(evento) {
            if (controlador.signal.aborted || document.hidden) return;
            if (evento?.detail?.match_id && Number(evento.detail.match_id) !== id) return;
            if (consultando) {
                pendiente = true;
                return;
            }

            window.clearTimeout(relojConsulta);
            consultando = true;
            try {
                let nuevos;
                do {
                    const resultado = await consultarSocial(ruta + '?despues=' + cursor, controlador.signal);
                    if (controlador.signal.aborted) return;
                    nuevos = resultado.data;
                    mostrarEscritura(Boolean(resultado.escribiendo));
                    if (nuevos.length) {
                        cursor = nuevos.at(-1).id;
                        setMensajesExtra(actuales => [...actuales, ...nuevos]);
                    }
                } while (nuevos.length === 40);
            } catch {
                // Se volverá a intentar en la siguiente consulta.
            } finally {
                consultando = false;
                if (!controlador.signal.aborted) {
                    const espera = pendiente ? 0 : frecuenciaConsulta.current;
                    pendiente = false;
                    relojConsulta = window.setTimeout(buscarNuevos, espera);
                }
            }
        }

        mostrarEscritura(Boolean(consulta.datos.escribiendo));
        relojConsulta = window.setTimeout(buscarNuevos, frecuenciaConsulta.current);
        document.addEventListener('visibilitychange', buscarNuevos);
        window.addEventListener('actividad-tiempo-real', buscarNuevos);
        window.addEventListener('escritura-tiempo-real', buscarNuevos);
        return () => {
            controlador.abort();
            window.clearTimeout(relojConsulta);
            window.clearTimeout(relojEscritura);
            document.removeEventListener('visibilitychange', buscarNuevos);
            window.removeEventListener('actividad-tiempo-real', buscarNuevos);
            window.removeEventListener('escritura-tiempo-real', buscarNuevos);
        };
    }, [id, ruta, consulta.datos]);

    useEffect(() => {
        if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    }, [ultimoMensaje, consulta.cargando]);

    useEffect(() => () => peticionAnteriores.current?.abort(), []);

    async function cargarAnteriores() {
        if (!mensajes.length || cargandoAnteriores) return;

        setCargandoAnteriores(true);
        setErrorAccion('');
        const controlador = new AbortController();
        peticionAnteriores.current = controlador;

        try {
            const anteriores = await consultarSocial(ruta + '?antes=' + mensajes[0].id, controlador.signal);
            if (!controlador.signal.aborted) {
                setMensajesExtra(actuales => [...actuales, ...anteriores.data]);
                setHayAnteriores(anteriores.hay_anteriores);
                setAviso(anteriores.data.length ? 'Mensajes anteriores cargados.' : 'No hay más mensajes anteriores.');
            }
        } catch (error) {
            if (!controlador.signal.aborted) setErrorAccion(error.message);
        } finally {
            if (!controlador.signal.aborted) setCargandoAnteriores(false);
        }
    }

    function actualizarConversacion() {
        setErrorAccion('');
        setAviso('');
        // Reinicia el cursor para que una actualización no deje huecos en el historial.
        setMensajesExtra([]);
        setHayAnteriores(null);
        consulta.recargar();
    }

    function avisarEscritura(activa) {
        const estado = escrituraPropia.current;
        const ahora = Date.now();
        if (estado.activa === activa && (!activa || ahora - estado.ultimoAviso < 3000)) return;

        estado.activa = activa;
        estado.ultimoAviso = ahora;
        estado.envio = estado.envio
            .then(() => enviarSocial(ruta + '/escritura', { escribiendo: activa }))
            .catch(() => {});
    }

    async function enviarMensaje(evento) {
        evento.preventDefault();
        const contenido = texto.trim();
        if (!contenido || enviando) return;

        avisarEscritura(false);
        setEnviando(true);
        setErrorAccion('');
        setAviso('');
        try {
            const resultado = await enviarSocial(ruta, { contenido });
            setMensajesExtra(actuales => [...actuales, resultado.data]);
            setTexto('');
            setAviso('Mensaje enviado.');
        } catch (error) {
            setErrorAccion(error.message);
        } finally {
            setEnviando(false);
        }
    }

    if (consulta.cargando) return <CargaSocial texto="Cargando conversación..." />;
    if (consulta.error) return <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />;

    return (
        <section className={tarjetaSocial} aria-labelledby="conversacion-titulo">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1edf2] pb-4">
                <div className="flex min-w-0 items-center gap-3">
                    <AvatarSocial nombre={consulta.datos.estudiante.nombre} />
                    <div className="min-w-0">
                        <h2 id="conversacion-titulo" className="text-lg leading-tight font-extrabold wrap-anywhere text-[#10233d]">{consulta.datos.estudiante.nombre}</h2>
                        <p className="mt-1 text-xs font-medium text-[#0b766f]">Conversación privada entre ustedes.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={botonSocialSecundario} disabled={llamadas.ocupado || Boolean(llamadas.llamada)}
                        onClick={() => llamadas.iniciar(id, 'audio')}>
                        <IconoSocial tipo="telefono" /> Llamar
                    </button>
                    <button type="button" className={botonSocial} disabled={llamadas.ocupado || Boolean(llamadas.llamada)}
                        onClick={() => llamadas.iniciar(id, 'video')}>
                        <IconoSocial tipo="video" /> Videollamada
                    </button>
                    <button type="button" className={botonSocialSecundario}
                        disabled={enviando || cargandoAnteriores} onClick={actualizarConversacion}>
                        Actualizar
                    </button>
                </div>
            </div>
            {!llamadas.llamada && llamadas.ocupado && (
                <p role="status" className="mt-3 text-sm text-slate-700">Preparando la llamada…</p>
            )}
            {!llamadas.llamada && llamadas.error && (
                <p role="alert" className="mt-3 text-sm text-red-800">{llamadas.error}</p>
            )}

            {(hayAnteriores ?? consulta.datos.hay_anteriores) && (
                <button type="button" className={'mt-4 ' + botonSocialSecundario}
                    disabled={cargandoAnteriores || enviando} onClick={cargarAnteriores}>
                    {cargandoAnteriores ? 'Cargando...' : 'Ver mensajes anteriores'}
                </button>
            )}

            <div ref={lista} tabIndex={mensajes.length ? 0 : undefined} role="region" aria-label="Historial de la conversación"
                className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-[#e1edf2] bg-linear-to-br from-[#edf4f8] to-[#eefaf8] p-4 focus-visible:outline-2 focus-visible:outline-[#0b766f]">
                {!mensajes.length ? (
                    <div className="grid justify-items-center gap-2 py-3 text-center">
                        <span className="grid size-10 place-items-center rounded-xl bg-white text-[#0b766f]">
                            <IconoSocial tipo="mensaje" />
                        </span>
                        <p className="text-sm text-slate-700">Aún no hay mensajes. Saluda a tu compañero para empezar.</p>
                    </div>
                ) : (
                    <ol className="grid gap-3">
                        {mensajes.map(mensaje => (
                            <li key={mensaje.id}
                                className={'max-w-[90%] min-w-0 rounded-2xl px-3.5 py-2.5 ' + (mensaje.es_mio
                                    ? 'justify-self-end rounded-tr-sm bg-[#123659] text-white'
                                    : 'justify-self-start rounded-tl-sm border border-[#d7e4ed] bg-white text-[#10233d]')}>
                                <p className="sr-only">{mensaje.es_mio ? 'Tú' : consulta.datos.estudiante.nombre}:</p>
                                <p className="text-sm whitespace-pre-wrap wrap-anywhere">{mensaje.contenido}</p>
                                {mensaje.creado_en && (
                                    <time dateTime={mensaje.creado_en}
                                        className={'mt-1 block text-xs ' + (mensaje.es_mio ? 'text-blue-100' : 'text-slate-600')}>
                                        {formatearFechaSocial(mensaje.creado_en)}
                                    </time>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            <p role="status" className="mt-2 min-h-5 text-sm text-[#0b766f]">
                {escribiendo ? consulta.datos.estudiante.nombre + ' está escribiendo…' : ''}
            </p>

            <form onSubmit={enviarMensaje} className="mt-2">
                <label htmlFor="contenido-mensaje" className="block text-sm font-bold text-[#123659]">Tu mensaje</label>
                <textarea id="contenido-mensaje" value={texto} rows={3} maxLength={2000} required disabled={enviando}
                    aria-describedby="mensaje-limite" placeholder="Escribe un mensaje"
                    className="mt-2 w-full rounded-xl border border-[#ccdce7] bg-[#f7fafc] px-3 py-2.5 text-sm text-[#10233d] focus-visible:outline-2 focus-visible:outline-[#0b766f]"
                    onChange={evento => {
                        setTexto(evento.target.value);
                        avisarEscritura(Boolean(evento.target.value.trim()));
                    }}
                    onBlur={() => avisarEscritura(false)} />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p id="mensaje-limite" className="text-xs text-slate-600">{texto.length}/2000 caracteres</p>
                    <button type="submit" disabled={enviando || !texto.trim()} className={botonSocial}>
                        {enviando ? 'Enviando...' : 'Enviar mensaje'}
                    </button>
                </div>
                {errorAccion && <p role="alert" className="mt-3 text-sm text-red-800">{errorAccion}</p>}
                <p role="status" className={aviso ? 'mt-3 text-sm text-green-800' : 'sr-only'}>{aviso}</p>
            </form>
        </section>
    );
}

export default function Mensajes({ tiempoRealConectado, llamadas }) {
    const [pagina, setPagina] = useState(1);
    const consulta = useConsultaSocial('/api/matches?tipo=conexiones&page=' + pagina);
    const valorMatch = new URLSearchParams(window.location.search).get('match');
    const match = /^\d+$/.test(valorMatch ?? '') && Number.isSafeInteger(Number(valorMatch)) && Number(valorMatch) > 0
        ? Number(valorMatch) : null;
    const mostrarPanel = match !== null || Boolean(consulta.datos?.total);

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Conversa con tus matches" etiqueta="Aprendizaje en equipo" icono="mensaje">
                Una vez aceptada la solicitud, puedes acordar con tu compañero qué tema estudiar y cuándo.
            </EncabezadoSocial>

            <div className={'grid items-start gap-4' + (mostrarPanel ? ' @min-[40rem]:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]' : '')}>
                <section className={tarjetaSocial + ' space-y-3'} aria-labelledby="conversaciones-titulo">
                    <div className="flex items-center justify-between gap-2">
                        <h2 id="conversaciones-titulo" className="text-lg font-extrabold tracking-tight text-[#10233d]">Conversaciones</h2>
                        {consulta.datos && (
                            <span className="rounded-full bg-[#dfeaf4] px-2.5 py-1 text-xs font-bold text-[#123659]" aria-label={consulta.datos.total + ' conversaciones'}>
                                {consulta.datos.total}
                            </span>
                        )}
                    </div>
                    {consulta.cargando ? (
                        <CargaSocial texto="Cargando conexiones..." />
                    ) : consulta.error ? (
                        <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                    ) : consulta.datos.data.length ? (
                        <>
                            <ul className="space-y-2">
                                {consulta.datos.data.map(conexion => (
                                    <li key={conexion.id}>
                                        <a href={'/mensajes?match=' + conexion.id}
                                            aria-current={conexion.id === match ? 'page' : undefined}
                                            className={'flex items-center gap-2 rounded-xl border p-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#0b766f] ' + (conexion.id === match
                                                ? 'border-[#83c9c0] bg-[#eefaf8] text-[#123659]'
                                                : 'border-[#d7e4ed] bg-[#f7fafc] text-[#10233d] hover:bg-[#eefaf8]')}>
                                            <AvatarSocial nombre={conexion.estudiante.nombre} />
                                            <span className="min-w-0 flex-1 wrap-anywhere">{conexion.estudiante.nombre}</span>
                                            <IconoSocial tipo="flecha" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <PaginacionSocial datos={consulta.datos} cambiarPagina={setPagina} />
                        </>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1edf2] pt-3">
                            <p className="text-sm text-slate-600">Todavía no tienes matches aceptados.</p>
                            <a href="/matches" className={botonSocialSecundario}>Ver mis matches</a>
                        </div>
                    )}
                </section>

                {match ? (
                    <Conversacion key={match} id={match} tiempoRealConectado={tiempoRealConectado} llamadas={llamadas} />
                ) : mostrarPanel && (
                    <section className={tarjetaSocial + ' flex items-start gap-3'}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dbf5f2] text-[#0b766f]">
                            <IconoSocial tipo="mensaje" />
                        </span>
                        <div>
                            <h2 className="font-bold text-[#123659]">Elige una conversación</h2>
                            <p className="mt-1 text-sm text-slate-600">Selecciona una conexión para ver los mensajes o escribir uno nuevo.</p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
