import { useEffect, useRef, useState } from 'react';
import {
    botonSocial, botonSocialSecundario, CargaSocial, consultarSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

function Conversacion({ id }) {
    const ruta = '/api/matches/' + id + '/mensajes';
    const consulta = useConsultaSocial(ruta);
    const [texto, setTexto] = useState('');
    const [mensajesExtra, setMensajesExtra] = useState([]);
    const [hayAnteriores, setHayAnteriores] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');
    const [aviso, setAviso] = useState('');
    const lista = useRef(null);
    const peticionAnteriores = useRef(null);

    // Combina el lote inicial con los mensajes anteriores y los enviados desde esta pantalla.
    const porId = new Map([...mensajesExtra, ...(consulta.datos?.data ?? [])].map(mensaje => [mensaje.id, mensaje]));
    const mensajes = [...porId.values()].sort((a, b) => a.id - b.id);
    const ultimoMensaje = mensajes.at(-1)?.id;

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

    async function enviarMensaje(evento) {
        evento.preventDefault();
        const contenido = texto.trim();
        if (!contenido || enviando) return;

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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="min-w-0">
                    <h2 id="conversacion-titulo" className="font-bold wrap-anywhere text-[#124277]">{consulta.datos.estudiante.nombre}</h2>
                    <p className="mt-1 text-xs text-slate-600">Conversación privada entre ustedes.</p>
                </div>
                <button type="button" className={botonSocialSecundario}
                    disabled={enviando || cargandoAnteriores} onClick={actualizarConversacion}>
                    Actualizar
                </button>
            </div>

            {(hayAnteriores ?? consulta.datos.hay_anteriores) && (
                <button type="button" className={'mt-4 ' + botonSocialSecundario}
                    disabled={cargandoAnteriores || enviando} onClick={cargarAnteriores}>
                    {cargandoAnteriores ? 'Cargando...' : 'Ver mensajes anteriores'}
                </button>
            )}

            <div ref={lista} tabIndex={mensajes.length ? 0 : undefined} role="region" aria-label="Historial de la conversación"
                className="mt-4 max-h-96 overflow-y-auto rounded-xl bg-slate-50 p-3 focus-visible:outline-2 focus-visible:outline-[#124277]">
                {!mensajes.length ? (
                    <p className="py-5 text-center text-sm text-slate-600">Aún no hay mensajes. Saluda a tu compañero para empezar.</p>
                ) : (
                    <ol className="grid gap-3">
                        {mensajes.map(mensaje => (
                            <li key={mensaje.id}
                                className={'max-w-[90%] min-w-0 rounded-xl px-3 py-2 ' + (mensaje.es_mio
                                    ? 'justify-self-end bg-[#124277] text-white'
                                    : 'justify-self-start border border-slate-200 bg-white text-slate-800')}>
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

            <form onSubmit={enviarMensaje} className="mt-4">
                <label htmlFor="contenido-mensaje" className="block text-sm font-semibold text-slate-800">Tu mensaje</label>
                <textarea id="contenido-mensaje" value={texto} rows={3} maxLength={2000} required disabled={enviando}
                    aria-describedby="mensaje-limite" placeholder="Escribe un mensaje"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#124277]"
                    onChange={evento => setTexto(evento.target.value)} />
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

export default function Mensajes() {
    const [pagina, setPagina] = useState(1);
    const consulta = useConsultaSocial('/api/matches?tipo=conexiones&page=' + pagina);
    const valorMatch = new URLSearchParams(window.location.search).get('match');
    const match = /^\d+$/.test(valorMatch ?? '') && Number.isSafeInteger(Number(valorMatch)) && Number(valorMatch) > 0
        ? Number(valorMatch) : null;

    return (
        <div className="perfil-contenido mt-6 space-y-5">
            <EncabezadoSocial titulo="Conversa con tus matches">
                Una vez aceptada la solicitud, puedes acordar con tu compañero qué tema estudiar y cuándo.
            </EncabezadoSocial>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
                <section className="space-y-3" aria-labelledby="conversaciones-titulo">
                    <h2 id="conversaciones-titulo" className="text-lg font-bold text-[#124277]">Conversaciones</h2>
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
                                            className={'block rounded-xl border p-3 text-sm font-semibold wrap-anywhere focus-visible:outline-2 focus-visible:outline-[#124277] ' + (conexion.id === match
                                                ? 'border-[#124277] bg-blue-50 text-[#124277]'
                                                : 'border-slate-200 bg-white text-slate-800 hover:bg-blue-50')}>
                                            {conexion.estudiante.nombre}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <PaginacionSocial datos={consulta.datos} cambiarPagina={setPagina} />
                        </>
                    ) : (
                        <div className={tarjetaSocial}>
                            <p className="text-sm text-slate-600">Todavía no tienes matches aceptados.</p>
                            <a href="/matches" className={'mt-3 ' + botonSocialSecundario}>Ver mis matches</a>
                        </div>
                    )}
                </section>

                {match ? (
                    <Conversacion key={match} id={match} />
                ) : (
                    <section className={tarjetaSocial}>
                        <h2 className="font-bold text-[#124277]">Elige una conversación</h2>
                        <p className="mt-1 text-sm text-slate-600">Selecciona una conexión para ver los mensajes o escribir uno nuevo.</p>
                    </section>
                )}
            </div>
        </div>
    );
}
