import { useState } from 'react';
import {
    botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

const secciones = [
    { id: 'recibidas', nombre: 'Recibidas', vacio: 'No tienes solicitudes por responder.' },
    { id: 'enviadas', nombre: 'Enviadas', vacio: 'No tienes solicitudes enviadas pendientes.' },
    { id: 'conexiones', nombre: 'Conexiones', vacio: 'Aquí aparecerán los matches que hayan sido aceptados.' },
    { id: 'historial', nombre: 'Historial', vacio: 'No tienes solicitudes rechazadas o canceladas.' },
];

const estados = {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    rechazado: 'Rechazado',
    cancelado: 'Cancelado',
};

const confirmaciones = {
    aceptar: 'Match aceptado. Ya pueden enviarse mensajes.',
    rechazar: 'Solicitud rechazada.',
    cancelar: 'Solicitud cancelada.',
};

export default function Matches() {
    const [filtro, setFiltro] = useState(() => {
        const inicial = new URLSearchParams(window.location.search).get('tipo');
        return { tipo: secciones.some(item => item.id === inicial) ? inicial : 'recibidas', pagina: 1 };
    });
    const [procesando, setProcesando] = useState(null);
    const [aviso, setAviso] = useState('');
    const [errorAccion, setErrorAccion] = useState('');
    const consulta = useConsultaSocial('/api/matches?' + new URLSearchParams({ tipo: filtro.tipo, page: filtro.pagina }));
    const seccion = secciones.find(item => item.id === filtro.tipo);

    async function responder(id, accion) {
        setProcesando(id);
        setAviso('');
        setErrorAccion('');

        try {
            await enviarSocial('/api/matches/' + id + '/responder', { accion });
            setAviso(confirmaciones[accion]);

            if (filtro.pagina > 1 && consulta.datos.data.length === 1) {
                setFiltro(anterior => ({ ...anterior, pagina: anterior.pagina - 1 }));
            } else {
                consulta.recargar();
            }
        } catch (error) {
            setErrorAccion(error.message);
            if (error.estado === 409) consulta.recargar();
        } finally {
            setProcesando(null);
        }
    }

    return (
        <div className="perfil-contenido mt-6 space-y-5">
            <EncabezadoSocial titulo="Organiza tus conexiones">
                Revisa las solicitudes de aprendizaje y abre una conversación cuando haya un match aceptado.
            </EncabezadoSocial>

            <nav aria-label="Secciones de matches" className="flex flex-wrap gap-2">
                {secciones.map(item => (
                    <button key={item.id} type="button" aria-pressed={filtro.tipo === item.id}
                        disabled={procesando !== null}
                        className={filtro.tipo === item.id ? botonSocial : botonSocialSecundario}
                        onClick={() => {
                            setAviso('');
                            setErrorAccion('');
                            setFiltro({ tipo: item.id, pagina: 1 });
                        }}>
                        {item.nombre}
                    </button>
                ))}
            </nav>

            <p role="status" className={aviso ? 'rounded-xl bg-green-50 p-3 text-sm text-green-800' : 'sr-only'}>{aviso}</p>
            {errorAccion && <ErrorSocial error={errorAccion} />}

            <section aria-labelledby="matches-seccion" className="space-y-3">
                <h2 id="matches-seccion" className="text-lg font-bold text-[#124277]">{seccion.nombre}</h2>
                {consulta.cargando ? (
                    <CargaSocial texto="Cargando matches..." />
                ) : consulta.error ? (
                    <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                ) : consulta.datos.data.length === 0 ? (
                    <div className={tarjetaSocial}>
                        <p className="text-sm text-slate-600">{seccion.vacio}</p>
                        <a href="/buscar-estudiantes" className={'mt-3 ' + botonSocialSecundario}>Buscar estudiantes</a>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {consulta.datos.data.map(match => (
                            <li key={match.id} className={tarjetaSocial + ' flex flex-wrap items-start justify-between gap-4'}>
                                <div className="min-w-0">
                                    <h3 className="font-bold wrap-anywhere text-[#124277]">{match.estudiante.nombre}</h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Solicitud {match.direccion} · {estados[match.estado]}
                                    </p>
                                    {match.actualizado_en && (
                                        <time dateTime={match.actualizado_en} className="mt-1 block text-xs text-slate-500">
                                            {formatearFechaSocial(match.actualizado_en)}
                                        </time>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {match.estado === 'pendiente' && match.direccion === 'recibida' && (
                                        <>
                                            <button type="button" disabled={procesando !== null} className={botonSocial}
                                                onClick={() => responder(match.id, 'aceptar')}>Aceptar</button>
                                            <button type="button" disabled={procesando !== null} className={botonSocialSecundario}
                                                onClick={() => responder(match.id, 'rechazar')}>Rechazar</button>
                                        </>
                                    )}
                                    {match.estado === 'pendiente' && match.direccion === 'enviada' && (
                                        <button type="button" disabled={procesando !== null} className={botonSocialSecundario}
                                            onClick={() => responder(match.id, 'cancelar')}>Cancelar solicitud</button>
                                    )}
                                    {match.estado === 'aceptado' && (
                                        <a href={'/mensajes?match=' + match.id} className={botonSocial}>Abrir conversación</a>
                                    )}
                                    {procesando === match.id && <p role="status" className="self-center text-sm text-slate-600">Guardando...</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <PaginacionSocial datos={consulta.datos} deshabilitada={procesando !== null}
                    cambiarPagina={pagina => setFiltro(anterior => ({ ...anterior, pagina }))} />
            </section>
        </div>
    );
}
