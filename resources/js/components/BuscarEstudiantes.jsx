import { useEffect, useState } from 'react';
import Skeleton from './Skeleton.jsx';
import {
    AvatarSocial, botonSocial, botonSocialSecundario, EncabezadoSocial, enviarSocial, ErrorSocial,
    IconoSocial, PaginacionSocial, pestanaSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

const filtrosIniciales = { texto: '', tipo: 'todos', pagina: 1, horario: false, habilidades: false };
const tipos = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'ensena', etiqueta: 'Pueden enseñar' },
    { valor: 'aprende', etiqueta: 'Quieren aprender' },
];
const claseCampo = 'w-full rounded-xl border border-[#ccdce7] bg-[#f4f8fb] py-2.5 pr-3 pl-10 text-[#10233d] focus:outline-2 focus:outline-offset-2 focus:outline-[#0b766f]';
const tarjetasEstudiantes = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4';

function Habilidades({ titulo, habilidades, colores, filtrar }) {
    return (
        <div>
            <h4 className="mb-2 text-sm font-bold text-[#123659]">{titulo}</h4>
            {habilidades.length ? (
                <ul className="flex flex-wrap gap-2" aria-label={titulo}>
                    {habilidades.map(habilidad => (
                        <li key={habilidad} className="min-w-0 max-w-full">
                            <button type="button" onClick={() => filtrar(habilidad)} aria-label={titulo + ': ' + habilidad}
                                className={'max-w-full rounded-full px-2.5 py-1 text-left text-sm font-semibold wrap-anywhere hover:underline focus-visible:outline-2 ' + colores}>
                                {habilidad}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-600">Sin habilidades añadidas.</p>
            )}
        </div>
    );
}

function AccionDeMatch({ estudiante }) {
    const [matchCreado, setMatchCreado] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const match = matchCreado ?? estudiante.match;

    async function solicitar() {
        setEnviando(true);
        setError('');
        try {
            const respuesta = await enviarSocial('/api/matches', { estudiante_id: estudiante.id });
            setMatchCreado(respuesta.data);
        } catch (problema) {
            setError(problema.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            {!match ? (
                <button type="button" className={botonSocial} disabled={enviando}
                    aria-label={'Solicitar match a ' + estudiante.nombre} onClick={solicitar}>
                    {enviando ? 'Enviando...' : 'Solicitar match'}
                </button>
            ) : match.estado === 'aceptado' ? (
                <a href={'/mensajes?match=' + match.id} className={botonSocial}>Abrir conversación</a>
            ) : match.estado === 'pendiente' ? (
                <a href={match.direccion === 'enviada' ? '/matches?tipo=enviadas' : '/matches'}
                    className={botonSocialSecundario}>
                    {match.direccion === 'enviada' ? 'Solicitud enviada' : 'Responder solicitud'}
                </a>
            ) : (
                <a href="/matches?tipo=historial" className={botonSocialSecundario}>Ver solicitud anterior</a>
            )}
            {error && <p role="alert" className="w-full text-sm text-red-800">{error}</p>}
            <p role="status" className="sr-only">{matchCreado ? 'Solicitud de match enviada.' : ''}</p>
        </div>
    );
}

function TarjetaEstudiante({ estudiante, aplicarFiltros }) {
    return (
        <article className={tarjetaSocial + ' flex flex-col transition-shadow hover:shadow-md focus-within:shadow-md'}>
            <div className="flex items-center gap-3 rounded-xl border border-[#e1edf2] bg-linear-to-br from-[#edf4fa] to-[#f0fbf9] p-3">
                <AvatarSocial nombre={estudiante.nombre} fotoUrl={estudiante.foto_url} />
                <div className="min-w-0">
                    <h3 className="text-lg leading-tight font-extrabold wrap-anywhere text-[#10233d]">{estudiante.nombre}</h3>
                    {(estudiante.programa || estudiante.semestre) && (
                        <p className="mt-1 text-xs font-semibold wrap-anywhere text-[#465a73]">
                            {[estudiante.programa, estudiante.semestre && 'Semestre ' + estudiante.semestre].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>
            </div>
            <p className="mt-3 whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-slate-700">
                {estudiante.presentacion || 'Sin presentación todavía.'}
            </p>
            {estudiante.preferencias_estudio && (
                <p className="mt-2 text-sm leading-relaxed wrap-anywhere text-slate-700">
                    <strong className="text-[#123659]">Cómo prefiere estudiar:</strong> {estudiante.preferencias_estudio}
                </p>
            )}
            <div className="my-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 border-t border-slate-200 pt-3">
                <Habilidades titulo="Puede enseñar" habilidades={estudiante.ensena} colores="bg-[#e9f1fb] text-[#123659]"
                    filtrar={habilidad => aplicarFiltros(habilidad, 'ensena')} />
                <Habilidades titulo="Quiere aprender" habilidades={estudiante.aprende} colores="bg-[#dbf5f2] text-[#14534e]"
                    filtrar={habilidad => aplicarFiltros(habilidad, 'aprende')} />
            </div>
            <AccionDeMatch estudiante={estudiante} />
        </article>
    );
}

export default function BuscarEstudiantes() {
    const [texto, setTexto] = useState('');
    const [filtros, setFiltros] = useState(() => ({
        ...filtrosIniciales,
        horario: new URLSearchParams(window.location.search).get('horario_comun') === '1',
    }));
    const parametros = new URLSearchParams({ buscar: filtros.texto, tipo: filtros.tipo, page: filtros.pagina });
    if (filtros.horario) parametros.set('horario_comun', '1');
    if (filtros.habilidades) parametros.set('habilidades_complementarias', '1');
    const { datos: resultados, cargando, error, recargar } = useConsultaSocial('/api/estudiantes?' + parametros);
    const filtroActivo = Boolean(filtros.texto) || filtros.tipo !== 'todos' || filtros.horario || filtros.habilidades;

    // Espera una pausa breve al escribir para evitar una petición por cada tecla.
    useEffect(() => {
        const termino = texto.trim();
        const espera = window.setTimeout(() => {
            setFiltros(actual => actual.texto === termino ? actual : { ...actual, texto: termino, pagina: 1 });
        }, 275);
        return () => window.clearTimeout(espera);
    }, [texto]);

    function aplicarFiltros(termino, tipo) {
        setTexto(termino);
        setFiltros(actual => ({ ...actual, texto: termino.trim(), tipo, pagina: 1 }));
    }

    function limpiarFiltros() {
        setTexto('');
        setFiltros(filtrosIniciales);
    }

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Encuentra compañeros de estudio" etiqueta="Comunidad" icono="personas" detalle={
                <a href="/perfil" className="inline-flex items-center gap-2 rounded-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
                    Configurar mi visibilidad <IconoSocial tipo="flecha" />
                </a>
            }>
                Explora los perfiles visibles y encuentra personas con quienes aprender o compartir lo que sabes.
            </EncabezadoSocial>

            <form role="search" aria-label="Buscar en el directorio"
                className={tarjetaSocial + ' grid items-end gap-3 @min-[48rem]:grid-cols-[minmax(0,1fr)_auto]'}
                onSubmit={evento => { evento.preventDefault(); aplicarFiltros(texto, filtros.tipo); }}>
                <div className="min-w-0">
                    <label htmlFor="buscar-estudiantes" className="block text-sm font-bold text-[#123659]">Nombre o habilidad</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <div className="relative min-w-0 flex-1 basis-44">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#0b766f]">
                                <IconoSocial tipo="buscar" />
                            </span>
                            <input id="buscar-estudiantes" type="search" maxLength={60} placeholder="Ej. Ana o Matemáticas"
                                aria-describedby="buscar-estudiantes-ayuda" value={texto} className={claseCampo}
                                onChange={evento => setTexto(evento.target.value)} />
                        </div>
                        <button type="submit" className={botonSocial}>Buscar</button>
                        {(texto || filtroActivo) && (
                            <button type="button" className={botonSocialSecundario} onClick={limpiarFiltros}>
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
                <div role="group" aria-label="Filtrar por intereses" className="flex flex-wrap gap-1 rounded-2xl bg-[#edf4f8] p-1">
                    {tipos.map(tipo => (
                        <button key={tipo.valor} type="button" aria-pressed={filtros.tipo === tipo.valor}
                            className={pestanaSocial}
                            onClick={() => aplicarFiltros(texto, tipo.valor)}>
                            {tipo.etiqueta}
                        </button>
                    ))}
                </div>
                <p id="buscar-estudiantes-ayuda" className="text-sm text-slate-600 @min-[48rem]:col-span-2">
                    Busca mientras escribes o selecciona una habilidad en una tarjeta para usarla como filtro.
                </p>
                <fieldset className="grid min-w-0 gap-2 border-t border-slate-200 pt-3 @min-[48rem]:col-span-2">
                    <legend className="sr-only">Filtros de compatibilidad</legend>
                    <label className="flex items-start gap-2 text-sm font-semibold">
                        <input type="checkbox" className="mt-0.5 size-4 accent-[#0b615a] focus-visible:outline-2"
                            checked={filtros.horario} onChange={evento => {
                                const horario = evento.target.checked;
                                setFiltros(actual => ({ ...actual, horario, pagina: 1 }));
                            }} />
                        Horarios en común
                    </label>
                    <label className="flex items-start gap-2 text-sm font-semibold">
                        <input type="checkbox" className="mt-0.5 size-4 accent-[#0b615a] focus-visible:outline-2"
                            checked={filtros.habilidades} onChange={evento => {
                                const habilidades = evento.target.checked;
                                setFiltros(actual => ({ ...actual, habilidades, pagina: 1 }));
                            }} />
                        Habilidades complementarias
                    </label>
                    <p className="text-sm text-slate-700">
                        Estos filtros usan <a href="/horarios" className="font-semibold underline focus-visible:outline-2">tus horarios</a> y{' '}
                        <a href="/perfil#habilidades" className="font-semibold underline focus-visible:outline-2">tus habilidades</a> guardadas.
                    </p>
                </fieldset>
            </form>

            <section aria-labelledby="buscar-resultados-titulo" aria-busy={cargando}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 id="buscar-resultados-titulo" className="text-lg font-extrabold tracking-tight text-[#10233d]">Resultados</h2>
                    {!cargando && !error && resultados && (
                        <p role="status" className="rounded-full bg-[#dfeaf4] px-3 py-1 text-sm font-semibold text-[#123659]">
                            {resultados.total} {resultados.total === 1 ? 'estudiante' : 'estudiantes'}
                        </p>
                    )}
                </div>

                {cargando ? (
                    <div className={tarjetasEstudiantes} role="status">
                        <p className="sr-only">Cargando estudiantes...</p>
                        {[0, 1, 2].map(indice => (
                            <div key={indice} className={tarjetaSocial}>
                                <Skeleton className="skeleton-titulo" />
                                <Skeleton className="skeleton-correo" />
                                <Skeleton className="skeleton-texto" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <ErrorSocial error="No se pudo cargar el directorio." reintentar={recargar} />
                ) : resultados?.data.length ? (
                    <div className={tarjetasEstudiantes}>
                        {resultados.data.map(estudiante => (
                            <TarjetaEstudiante key={estudiante.id} estudiante={estudiante} aplicarFiltros={aplicarFiltros} />
                        ))}
                    </div>
                ) : (
                    <div className={tarjetaSocial}>
                        <span className="mb-3 grid size-10 place-items-center rounded-xl bg-[#dbf5f2] text-[#0b766f]">
                            <IconoSocial tipo="buscar" />
                        </span>
                        <h3 className="font-bold text-[#123659]">No encontramos estudiantes</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            {filtroActivo
                                ? 'Prueba con otro nombre o habilidad, o revisa los filtros.'
                                : 'Por ahora no hay otros estudiantes que hayan elegido aparecer en el directorio.'}
                        </p>
                        {filtroActivo && (
                            <button type="button" onClick={limpiarFiltros} className={'mt-3 ' + botonSocialSecundario}>
                                Ver todos
                            </button>
                        )}
                    </div>
                )}

                {resultados?.last_page > 1 && (
                    <div className="mt-4">
                        <PaginacionSocial datos={resultados} cambiarPagina={pagina => setFiltros(actual => ({ ...actual, pagina }))} />
                    </div>
                )}
            </section>
        </div>
    );
}
