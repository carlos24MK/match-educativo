import Skeleton from './Skeleton.jsx';
import { botonSocialSecundario, formatearFechaSocial, tarjetaSocial, useConsultaSocial } from './SocialComun.jsx';

const iconos = {
    solicitudes: 'M4 4h16v12H4z M4 12h5l1 2h4l1-2h5 M8 20h8',
    matches: 'M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6 M14 11a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6',
    avisos: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
};
const enlace = 'inline-block rounded text-sm font-semibold text-[#124277] underline underline-offset-4 focus-visible:outline-2';

function Dato({ consulta, etiqueta, children, claseSkeleton }) {
    if (consulta.cargando) {
        return (
            <div role="status">
                <span className="sr-only">Cargando {etiqueta}…</span>
                <Skeleton className={claseSkeleton} />
            </div>
        );
    }

    if (consulta.error) {
        return (
            <div className="text-sm">
                <p className="mb-1 text-slate-600">No se pudo cargar.</p>
                <button type="button" className={enlace} onClick={consulta.recargar}>
                    Reintentar <span className="sr-only">{etiqueta}</span>
                </button>
            </div>
        );
    }

    return children(consulta.datos);
}

function Indicador({ titulo, icono, consulta, campo, ruta, accion }) {
    return (
        <article className={tarjetaSocial}>
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#124277]">
                    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconos[icono]} />
                    </svg>
                </span>
                <h3 className="text-sm font-semibold text-slate-700">{titulo}</h3>
            </div>
            <div className="mt-3 min-h-9" aria-live="polite">
                <Dato consulta={consulta} etiqueta={titulo.toLowerCase()} claseSkeleton="h-8 w-16">
                    {datos => <p className="text-3xl font-bold tabular-nums text-[#124277]">{datos[campo]}</p>}
                </Dato>
            </div>
            <a href={ruta} className={'mt-2 ' + enlace}>{accion}</a>
        </article>
    );
}

function ResumenPerfil({ consulta }) {
    return (
        <section aria-labelledby="dashboard-perfil" className={tarjetaSocial}>
            <h2 id="dashboard-perfil" className="text-lg font-bold text-[#124277]">Tu perfil de aprendizaje</h2>
            <div className="mt-3">
                <Dato consulta={consulta} etiqueta="tu perfil" claseSkeleton="h-16 w-full">
                    {perfil => (
                        <>
                            <p className="text-sm leading-relaxed text-slate-600">
                                {perfil.ensena.length || perfil.aprende.length
                                    ? 'Mantén tus habilidades al día para encontrar compañeros con intereses en común.'
                                    : 'Añade un tema que puedas enseñar y otro que te interese aprender.'}
                            </p>
                            <dl className="my-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                <div>
                                    <dt>Para enseñar</dt>
                                    <dd className="font-bold text-[#124277]">{perfil.ensena.length}</dd>
                                </div>
                                <div>
                                    <dt>Para aprender</dt>
                                    <dd className="font-bold text-[#124277]">{perfil.aprende.length}</dd>
                                </div>
                            </dl>
                            <p className="text-sm text-slate-600">
                                {perfil.visible_en_busqueda ? 'Tu perfil aparece en la búsqueda.' : 'Tu perfil está oculto en la búsqueda. Puedes cambiarlo en Mi perfil.'}
                            </p>
                        </>
                    )}
                </Dato>
            </div>
            <a href="/perfil" className={'mt-4 ' + botonSocialSecundario}>Ir a Mi perfil</a>
        </section>
    );
}

function ActividadReciente({ consulta }) {
    return (
        <section aria-labelledby="dashboard-actividad" className={tarjetaSocial}>
            <h2 id="dashboard-actividad" className="text-lg font-bold text-[#124277]">Actividad reciente</h2>
            <div className="mt-3">
                <Dato consulta={consulta} etiqueta="tu actividad" claseSkeleton="h-16 w-full">
                    {({ data }) => data.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.slice(0, 3).map(aviso => (
                                <li key={aviso.id} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-slate-800">{aviso.titulo}</p>
                                        {!aviso.leida && <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-[#125b69]">Nueva</span>}
                                    </div>
                                    <p className="mt-1 text-sm wrap-anywhere text-slate-600">{aviso.descripcion}</p>
                                    <time dateTime={aviso.creada_en} className="mt-1 block text-xs text-slate-600">
                                        {formatearFechaSocial(aviso.creada_en)}
                                    </time>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm leading-relaxed text-slate-600">
                            Aún no tienes actividad. Las solicitudes, respuestas y avisos de mensajes aparecerán aquí.
                        </p>
                    )}
                </Dato>
            </div>
        </section>
    );
}

export default function ResumenDashboard({ usuario }) {
    // Cada tarjeta usa los mismos datos que su sección completa.
    const perfil = useConsultaSocial('/api/perfil');
    const solicitudes = useConsultaSocial('/api/matches?tipo=recibidas');
    const matches = useConsultaSocial('/api/matches?tipo=conexiones');
    const avisos = useConsultaSocial('/api/notificaciones');

    return (
        <div className="mt-6 max-w-6xl space-y-6">
            <section className="perfil-resumen" aria-labelledby="dashboard-bienvenida">
                <div className="relative">
                    <p className="text-sm font-semibold text-cyan-100">Tu espacio de aprendizaje</p>
                    <h2 id="dashboard-bienvenida" className="mt-2 text-2xl font-bold wrap-anywhere text-white sm:text-3xl">
                        Hola, {usuario.name}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
                        Encuentra compañeros que compartan tus intereses y organiza tus próximos encuentros de estudio.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <a href="/buscar-estudiantes" className={botonSocialSecundario + ' focus-visible:outline-white'}>Buscar compañeros</a>
                        <a href="/mensajes" className="inline-flex items-center rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                            Abrir mensajes
                        </a>
                    </div>
                </div>
            </section>

            <section aria-labelledby="dashboard-resumen">
                <h2 id="dashboard-resumen" className="mb-3 text-lg font-bold text-[#124277]">Tus conexiones</h2>
                <div className="grid gap-3 lg:grid-cols-3">
                    <Indicador titulo="Solicitudes pendientes" icono="solicitudes" consulta={solicitudes} campo="total"
                        ruta="/matches?tipo=recibidas" accion="Ver solicitudes" />
                    <Indicador titulo="Matches aceptados" icono="matches" consulta={matches} campo="total"
                        ruta="/matches?tipo=conexiones" accion="Ver conexiones" />
                    <Indicador titulo="Notificaciones sin leer" icono="avisos" consulta={avisos} campo="no_leidas"
                        ruta="/notificaciones" accion="Ver notificaciones" />
                </div>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-2">
                <ResumenPerfil consulta={perfil} />
                <ActividadReciente consulta={avisos} />
            </div>
        </div>
    );
}
