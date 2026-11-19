import { useEffect, useState } from 'react';
import {
    botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, IconoSocial, listaSocial, PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

function destinoDe(notificacion) {
    if (notificacion.tipo === 'reporte_nuevo') {
        return {
            ruta: notificacion.reporte_id ? '/administracion?reporte=' + encodeURIComponent(notificacion.reporte_id) : '/administracion',
            texto: 'Revisar reporte',
        };
    }

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

    useEffect(() => {
        const actualizar = () => consulta.recargar();
        window.addEventListener('actividad-tiempo-real', actualizar);
        return () => window.removeEventListener('actividad-tiempo-real', actualizar);
    }, []);

    async function marcarLeida(id = null) {
        setProcesando(true);
        setErrorAccion('');
        setAviso('');
        try {
            const ruta = id
                ? '/api/notificaciones/' + encodeURIComponent(id) + '/leer'
                : '/api/notificaciones/leer-todas';
            await enviarSocial(ruta, {});
            window.dispatchEvent(new Event('notificaciones-actualizadas'));
            setAviso(id ? 'Notificación marcada como leída.' : 'Todas las notificaciones están marcadas como leídas.');
            consulta.recargar();
        } catch (error) {
            setErrorAccion(error.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Mantente al día" etiqueta="Centro de actividad" icono="campana" detalle={
                <p role="status" className="font-semibold">
                    {consulta.datos ? 'Sin leer: ' + consulta.datos.no_leidas : 'Actividad reciente'}
                </p>
            }>
                {consulta.datos?.es_admin
                    ? 'Consulta los avisos de tu cuenta y los reportes enviados por la comunidad.'
                    : 'Aquí verás las solicitudes de match, sus respuestas y los avisos de mensajes nuevos.'}
            </EncabezadoSocial>

            <div className={tarjetaSocial + ' flex flex-wrap items-center justify-between gap-3'}>
                <h2 className="text-lg font-extrabold tracking-tight text-[#10233d]">Actividad reciente</h2>
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
                <section className={tarjetaSocial + ' flex items-start gap-3'}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dbf5f2] text-[#0b766f]">
                        <IconoSocial tipo="campana" />
                    </span>
                    <div>
                        <h3 className="font-bold text-[#123659]">No tienes notificaciones</h3>
                        <p className="mt-1 text-sm text-slate-600">Los nuevos avisos aparecerán aquí cuando haya actividad en tu cuenta.</p>
                    </div>
                </section>
            ) : (
                <ul className={listaSocial} aria-label="Notificaciones recibidas">
                    {consulta.datos.data.map(notificacion => {
                        const destino = destinoDe(notificacion);
                        return (
                            <li key={notificacion.id}
                                className={tarjetaSocial + ' flex flex-col' + (notificacion.leida ? '' : ' border-l-4 border-l-[#0b766f]')}>
                                <div className="flex items-start gap-3">
                                    <span className={'grid size-10 shrink-0 place-items-center rounded-xl ' + (notificacion.leida
                                        ? 'bg-[#edf4f8] text-[#123659]' : 'bg-[#dbf5f2] text-[#0b766f]')}>
                                        <IconoSocial tipo={notificacion.tipo === 'reporte_nuevo' ? 'campana'
                                            : notificacion.tipo === 'mensaje_recibido' ? 'mensaje' : 'conexion'} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <h3 className="font-extrabold wrap-anywhere text-[#10233d]">{notificacion.titulo}</h3>
                                            <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + (notificacion.leida
                                                ? 'bg-slate-100 text-slate-700' : 'bg-[#dbf5f2] text-[#14534e]')}>
                                                {notificacion.leida ? 'Leída' : 'Nueva'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm wrap-anywhere text-slate-700">{notificacion.descripcion}</p>
                                        {notificacion.creada_en && (
                                            <time dateTime={notificacion.creada_en} className="mt-1.5 block text-xs text-slate-600">
                                                {formatearFechaSocial(notificacion.creada_en)}
                                            </time>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
