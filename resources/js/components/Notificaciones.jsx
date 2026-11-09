import { useState } from 'react';
import {
    botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

function destinoDe(notificacion) {
    if (notificacion.tipo === 'mensaje_recibido' || notificacion.tipo === 'solicitud_aceptada') {
        return notificacion.match_id
            ? { ruta: '/mensajes?match=' + notificacion.match_id, texto: 'Abrir conversación' }
            : { ruta: '/mensajes', texto: 'Ver mensajes' };
    }
    if (notificacion.tipo === 'solicitud_rechazada') {
        return { ruta: '/matches?tipo=historial', texto: 'Ver historial' };
    }
    return { ruta: '/matches', texto: 'Ver solicitudes' };
}

export default function Notificaciones() {
    const [pagina, setPagina] = useState(1);
    const [procesando, setProcesando] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');
    const [aviso, setAviso] = useState('');
    const consulta = useConsultaSocial('/api/notificaciones?page=' + pagina);

    async function marcarLeida(id = null) {
        setProcesando(true);
        setErrorAccion('');
        setAviso('');
        try {
            const ruta = id
                ? '/api/notificaciones/' + encodeURIComponent(id) + '/leer'
                : '/api/notificaciones/leer-todas';
            await enviarSocial(ruta, {});
            setAviso(id ? 'Notificación marcada como leída.' : 'Todas las notificaciones están marcadas como leídas.');
            consulta.recargar();
        } catch (error) {
            setErrorAccion(error.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="perfil-contenido mt-6 space-y-5">
            <EncabezadoSocial titulo="Mantente al día">
                Aquí verás las solicitudes de match, sus respuestas y los avisos de mensajes nuevos.
            </EncabezadoSocial>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p role="status" className="text-sm font-semibold text-slate-700">
                    {consulta.datos ? 'Sin leer: ' + consulta.datos.no_leidas : 'Actividad reciente'}
                </p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={botonSocialSecundario}
                        disabled={consulta.cargando || procesando} onClick={consulta.recargar}>Actualizar</button>
                    <button type="button" className={botonSocial} disabled={procesando || !consulta.datos?.no_leidas}
                        onClick={() => marcarLeida()}>Marcar todas como leídas</button>
                </div>
            </div>

            {errorAccion && <ErrorSocial error={errorAccion} />}
            <p role="status" className={aviso ? 'rounded-xl bg-green-50 p-3 text-sm text-green-800' : 'sr-only'}>{aviso}</p>

            {consulta.cargando ? (
                <CargaSocial texto="Cargando notificaciones..." />
            ) : consulta.error ? (
                <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
            ) : consulta.datos.data.length === 0 ? (
                <section className={tarjetaSocial}>
                    <h2 className="font-bold text-[#124277]">No tienes notificaciones</h2>
                    <p className="mt-1 text-sm text-slate-600">Los nuevos avisos aparecerán aquí cuando haya actividad en tu cuenta.</p>
                </section>
            ) : (
                <ul className="space-y-3" aria-label="Notificaciones recibidas">
                    {consulta.datos.data.map(notificacion => {
                        const destino = destinoDe(notificacion);
                        return (
                            <li key={notificacion.id}
                                className={tarjetaSocial + (notificacion.leida ? '' : ' border-l-4 border-l-[#126275]')}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="font-bold wrap-anywhere text-[#124277]">{notificacion.titulo}</h2>
                                        <p className="mt-1 text-sm wrap-anywhere text-slate-700">{notificacion.descripcion}</p>
                                    </div>
                                    <span className={'rounded-full px-2 py-1 text-xs font-semibold ' + (notificacion.leida
                                        ? 'bg-slate-100 text-slate-700' : 'bg-cyan-100 text-[#125b69]')}>
                                        {notificacion.leida ? 'Leída' : 'Nueva'}
                                    </span>
                                </div>
                                {notificacion.creada_en && (
                                    <time dateTime={notificacion.creada_en} className="mt-2 block text-xs text-slate-600">
                                        {formatearFechaSocial(notificacion.creada_en)}
                                    </time>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a href={destino.ruta} className={botonSocialSecundario}>{destino.texto}</a>
                                    {!notificacion.leida && (
                                        <button type="button" className={botonSocialSecundario} disabled={procesando}
                                            onClick={() => marcarLeida(notificacion.id)}>Marcar como leída</button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <PaginacionSocial datos={consulta.datos} deshabilitada={procesando} cambiarPagina={setPagina} />
        </div>
    );
}
