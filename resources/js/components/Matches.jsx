import { useState } from 'react';
import { diasSemana } from './Horarios.jsx';
import {
    AvatarSocial, botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial, enviarSocial, ErrorSocial,
    formatearFechaSocial, IconoSocial, listaSocial, PaginacionSocial, pestanaSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

const secciones = [
    { id: 'recibidas', nombre: 'Recibidas', vacio: 'No tienes solicitudes por responder.' },
    { id: 'enviadas', nombre: 'Enviadas', vacio: 'No tienes solicitudes enviadas pendientes.' },
    { id: 'conexiones', nombre: 'Conexiones', vacio: 'Aquí aparecerán los matches que hayan sido aceptados.' },
    { id: 'historial', nombre: 'Historial', vacio: 'No tienes solicitudes rechazadas o canceladas.' },
];

const estados = {
    pendiente: { texto: 'Pendiente', colores: 'bg-[#fff0d6] text-[#714315]' },
    aceptado: { texto: 'Aceptado', colores: 'bg-[#dbf5f2] text-[#14534e]' },
    rechazado: { texto: 'Rechazado', colores: 'bg-rose-50 text-rose-800' },
    cancelado: { texto: 'Cancelado', colores: 'bg-slate-100 text-slate-700' },
};

const confirmaciones = {
    aceptar: 'Match aceptado. Ya puedes consultar su disponibilidad y abrir una conversación.',
    rechazar: 'Solicitud rechazada.',
    cancelar: 'Solicitud cancelada.',
};

function DisponibilidadMatch({ horarios }) {
    return (
        <div className="rounded-xl bg-[#edf4f8] p-3">
            <p className="text-sm font-semibold text-[#10233d]">Disponibilidad semanal</p>
            {horarios.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">Todavía no ha compartido su horario.</p>
            ) : (
                <>
                    <p className="mt-1 text-xs text-slate-600">Hora de Colombia</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                        {horarios.map(({ dia, inicio, fin }) => (
                            <li key={dia + '-' + inicio} className="rounded-lg border border-[#d7e4ed] bg-white px-2.5 py-1 text-sm text-[#123659]">
                                <span className="font-semibold">{diasSemana[dia - 1]}</span> {inicio}–{fin}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

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

            if (accion === 'aceptar') {
                setFiltro({ tipo: 'conexiones', pagina: 1 });
            } else if (filtro.pagina > 1 && consulta.datos.data.length === 1) {
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
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Organiza tus conexiones" etiqueta="Matches académicos" icono="conexion">
                Revisa las solicitudes de aprendizaje y abre una conversación cuando haya un match aceptado.
            </EncabezadoSocial>

            <p role="status" className={aviso ? 'rounded-xl bg-green-50 p-3 text-sm text-green-800' : 'sr-only'}>{aviso}</p>
            {errorAccion && <ErrorSocial error={errorAccion} />}

            <section aria-labelledby="matches-seccion" className="space-y-3">
                <div className={tarjetaSocial + ' flex flex-wrap items-center justify-between gap-3'}>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="matches-seccion" className="text-lg font-extrabold tracking-tight text-[#10233d]">{seccion.nombre}</h2>
                        {consulta.datos && (
                            <span className="rounded-full bg-[#dfeaf4] px-2.5 py-1 text-xs font-bold text-[#123659]" aria-label={consulta.datos.total + ' en esta sección'}>
                                {consulta.datos.total}
                            </span>
                        )}
                    </div>
                    <nav aria-label="Secciones de matches" className="flex flex-wrap gap-1 rounded-2xl bg-[#edf4f8] p-1">
                        {secciones.map(item => (
                            <button key={item.id} type="button" aria-pressed={filtro.tipo === item.id}
                                disabled={procesando !== null}
                                className={pestanaSocial}
                                onClick={() => {
                                    setAviso('');
                                    setErrorAccion('');
                                    setFiltro({ tipo: item.id, pagina: 1 });
                                }}>
                                {item.nombre}
                            </button>
                        ))}
                    </nav>
                </div>
                {consulta.cargando ? (
                    <CargaSocial texto="Cargando matches..." />
                ) : consulta.error ? (
                    <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                ) : consulta.datos.data.length === 0 ? (
                    <div className={tarjetaSocial + ' flex flex-wrap items-center justify-between gap-3'}>
                        <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dbf5f2] text-[#0b766f]">
                                <IconoSocial tipo="conexion" />
                            </span>
                            <p className="text-sm text-slate-700">{seccion.vacio}</p>
                        </div>
                        <a href="/buscar-estudiantes" className={botonSocialSecundario}>Buscar estudiantes</a>
                    </div>
                ) : (
                    <ul className={listaSocial}>
                        {consulta.datos.data.map(match => (
                            <li key={match.id} className={tarjetaSocial + ' grid content-start gap-3'}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <AvatarSocial nombre={match.estudiante.nombre} />
                                        <div className="min-w-0">
                                            <h3 className="leading-tight font-extrabold wrap-anywhere text-[#10233d]">{match.estudiante.nombre}</h3>
                                            <p className="mt-1 text-sm text-slate-600">Solicitud {match.direccion}</p>
                                            {match.actualizado_en && (
                                                <time dateTime={match.actualizado_en} className="mt-1 block text-xs text-slate-500">
                                                    {formatearFechaSocial(match.actualizado_en)}
                                                </time>
                                            )}
                                        </div>
                                    </div>
                                    <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + estados[match.estado].colores}>
                                        {estados[match.estado].texto}
                                    </span>
                                </div>

                                {match.estado === 'aceptado' && <DisponibilidadMatch horarios={match.estudiante.horarios ?? []} />}

                                <div className="flex empty:hidden flex-wrap gap-2 border-t border-[#e1edf2] pt-3">
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
