import Skeleton from './Skeleton.jsx';
import { botonSocialSecundario, formatearFechaSocial, tarjetaSocial, useConsultaSocial } from './SocialComun.jsx';

const iconos = {
    solicitudes: 'M4 4h16v12H4z M4 12h5l1 2h4l1-2h5 M8 20h8',
    matches: 'M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6 M14 11a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6',
    avisos: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
};
const enlace = 'inline-block rounded text-sm font-semibold text-[#124277] underline underline-offset-4 focus-visible:outline-2';
const colores = {
    solicitudes: 'bg-[#e7f0ff] text-[#244b82]',
    matches: 'bg-[#dbf5f2] text-[#0b665d]',
    avisos: 'bg-[#fff0d7] text-[#745018]',
};

function MapaAprendizaje() {
    return (
        <svg aria-hidden="true" className="hidden h-40 w-full max-w-72 self-center @min-[45rem]:block"
            viewBox="0 0 288 160" fill="none">
            <path d="M49 111c16-51 85-83 154-67m-115 86c51 19 102-7 134-56"
                stroke="#a5e9df" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="4 6" />
            <circle cx="143" cy="80" r="66" stroke="#c3eceb" strokeOpacity=".16" />
            <circle cx="143" cy="80" r="49" stroke="#c3eceb" strokeOpacity=".24" />
            <rect x="108" y="46" width="70" height="70" rx="20" fill="#164a63" stroke="#9fe4e0" />
            <path d="M143 66l20 11-20 11-20-11 20-11Zm-12 15v12c7 5 17 5 24 0V81m8-4v15"
                stroke="#d8fff5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="31" y="91" width="44" height="44" rx="13" fill="#174d66" stroke="#8ac7e5" />
            <path d="M52 102c-5-4-10-4-15-2v18c5-2 10-2 15 2 5-4 10-4 15-2v-18c-5-2-10-2-15 2v18"
                transform="translate(12 33) scale(.77)" stroke="#d6efff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="202" y="31" width="50" height="50" rx="14" fill="#23675f" stroke="#a4e8db" />
            <path d="M216 49h22v14h-13l-5 5v-5h-4z M221 54h12" stroke="#d9fff3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M93 39v14m-7-7h14m88 77v10m-5-5h10m65-26v12m-6-6h12"
                stroke="#f0bd66" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

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
            <div className="flex items-start justify-between gap-3">
                <h3 className="mt-1 text-sm font-semibold text-[#465a73]">{titulo}</h3>
                <span className={'grid size-10 shrink-0 place-items-center rounded-xl ' + colores[icono]}>
                    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconos[icono]} />
                    </svg>
                </span>
            </div>
            <div className="min-h-9" aria-live="polite">
                <Dato consulta={consulta} etiqueta={titulo.toLowerCase()} claseSkeleton="h-8 w-16">
                    {datos => <p className="text-4xl font-bold tracking-tight tabular-nums text-[#10233d]">{datos[campo]}</p>}
                </Dato>
            </div>
            <a href={ruta} className={'mt-3 ' + enlace}>
                {accion}
                <svg aria-hidden="true" className="ml-1 inline size-3" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l8-8 M5 4h7v7" />
                </svg>
            </a>
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
                            <dl className="my-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
                                <div className="rounded-xl bg-[#edf4ff] p-3">
                                    <dt>Para enseñar</dt>
                                    <dd className="mt-1 text-xl font-bold text-[#124277]">{perfil.ensena.length}</dd>
                                </div>
                                <div className="rounded-xl bg-[#e7f7f4] p-3">
                                    <dt>Para aprender</dt>
                                    <dd className="mt-1 text-xl font-bold text-[#0b665d]">{perfil.aprende.length}</dd>
                                </div>
                            </dl>
                            <p className="text-sm text-slate-600">
                                {perfil.visible_en_busqueda ? 'Tu perfil aparece en la búsqueda.' : 'Tu perfil está oculto en la búsqueda. Puedes cambiarlo en Mi perfil.'}
                            </p>
                        </>
                    )}
                </Dato>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <a href="/perfil#habilidades" className={botonSocialSecundario}>Editar habilidades</a>
                <a href="/horarios" className={botonSocialSecundario}>Gestionar horarios</a>
            </div>
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
                        <ul className="ml-1.5 border-l border-[#d9e5ee]">
                            {data.slice(0, 3).map(aviso => (
                                <li key={aviso.id} className="relative pb-4 pl-4 last:pb-0">
                                    <span aria-hidden="true" className={'absolute top-1.5 -left-1 size-2 rounded-full ring-2 ring-white ' + (aviso.leida ? 'bg-[#7c96ac]' : 'bg-[#0b766f]')} />
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
        <div className="perfil-contenido mt-5 space-y-5">
            <section className="perfil-resumen" aria-labelledby="dashboard-bienvenida">
                <div className="relative grid items-center gap-4 @min-[45rem]:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)]">
                    <div className="min-w-0 max-w-lg">
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-[#cff5ee]">
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f0bd66]" />
                            Tu espacio de aprendizaje
                        </p>
                        <h2 id="dashboard-bienvenida" className="mt-2 text-3xl font-bold tracking-tight wrap-anywhere text-white sm:text-4xl">
                            Hola, {usuario.name}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-[#d6f0f2]">
                            Encuentra compañeros que compartan tus intereses y organiza tus próximos encuentros de estudio.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <a href="/buscar-estudiantes" className="inline-flex items-center justify-center rounded-xl bg-[#dbf5f2] px-4 py-2.5 text-sm font-bold text-[#123659] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Buscar compañeros</a>
                            <a href="/mensajes" className="inline-flex items-center rounded-xl border border-white/45 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                                Abrir mensajes
                            </a>
                        </div>
                    </div>
                    <MapaAprendizaje />
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

            <div className="perfil-habilidades items-start">
                <ResumenPerfil consulta={perfil} />
                <ActividadReciente consulta={avisos} />
            </div>
        </div>
    );
}
