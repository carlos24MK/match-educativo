import { useEffect, useState } from 'react';
import Skeleton from './Skeleton.jsx';
import {
    botonSocial, botonSocialSecundario, enviarSocial, ErrorSocial, PaginacionSocial, useConsultaSocial,
} from './SocialComun.jsx';

const filtrosIniciales = { texto: '', tipo: 'todos', pagina: 1 };
const tipos = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'ensena', etiqueta: 'Pueden enseñar' },
    { valor: 'aprende', etiqueta: 'Quieren aprender' },
];
const claseTarjeta = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const claseCampo = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 focus:outline-2 focus:outline-offset-2 focus:outline-[#16778b]';

function Habilidades({ titulo, habilidades, colores, filtrar }) {
    return (
        <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">{titulo}</h4>
            {habilidades.length ? (
                <ul className="flex flex-wrap gap-2" aria-label={titulo}>
                    {habilidades.map(habilidad => (
                        <li key={habilidad} className="min-w-0 max-w-full">
                            <button type="button" onClick={() => filtrar(habilidad)} aria-label={titulo + ': ' + habilidad}
                                className={'max-w-full rounded-lg px-2.5 py-1 text-left text-sm font-medium wrap-anywhere hover:underline focus-visible:outline-2 ' + colores}>
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
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
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
    const iniciales = estudiante.nombre.trim().split(/\s+/).slice(0, 2)
        .map(palabra => Array.from(palabra)[0]).join('').toLocaleUpperCase('es');

    return (
        <article className={claseTarjeta}>
            <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-[#124277]">
                    {iniciales}
                </span>
                <h3 className="min-w-0 text-lg font-bold wrap-anywhere text-[#124277]">{estudiante.nombre}</h3>
            </div>
            <p className="mt-3 whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-slate-700">
                {estudiante.presentacion || 'Sin presentación todavía.'}
            </p>
            <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4">
                <Habilidades titulo="Puede enseñar" habilidades={estudiante.ensena} colores="bg-blue-50 text-[#124277]"
                    filtrar={habilidad => aplicarFiltros(habilidad, 'ensena')} />
                <Habilidades titulo="Quiere aprender" habilidades={estudiante.aprende} colores="bg-cyan-50 text-[#125b69]"
                    filtrar={habilidad => aplicarFiltros(habilidad, 'aprende')} />
            </div>
            <AccionDeMatch estudiante={estudiante} />
        </article>
    );
}

export default function BuscarEstudiantes() {
    const [texto, setTexto] = useState('');
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const parametros = new URLSearchParams({ buscar: filtros.texto, tipo: filtros.tipo, page: filtros.pagina });
    const { datos: resultados, cargando, error, recargar } = useConsultaSocial('/api/estudiantes?' + parametros);
    const filtroActivo = Boolean(filtros.texto) || filtros.tipo !== 'todos';

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
        setFiltros({ texto: termino.trim(), tipo, pagina: 1 });
    }

    return (
        <div className="perfil-contenido mt-6 space-y-5">
            <section className="perfil-resumen">
                <div className="relative">
                    <h2 className="text-xl font-bold text-white sm:text-2xl">Directorio de estudiantes</h2>
                    <p className="mt-1 text-sm text-blue-100">
                        Explora los perfiles visibles y encuentra personas con quienes aprender o compartir lo que sabes.
                    </p>
                    <p className="mt-3 text-sm text-blue-100">
                        ¿Quieres aparecer aquí? Activa la visibilidad en{' '}
                        <a href="/perfil" className="rounded font-semibold text-white underline underline-offset-4 focus-visible:outline-2">
                            Mi perfil
                        </a>.
                    </p>
                </div>
            </section>

            <form role="search" aria-label="Buscar en el directorio" className={claseTarjeta}
                onSubmit={evento => { evento.preventDefault(); aplicarFiltros(texto, filtros.tipo); }}>
                <label htmlFor="buscar-estudiantes" className="block text-sm font-semibold text-slate-800">Nombre o habilidad</label>
                <div className="mt-2 flex flex-wrap gap-2 sm:flex-nowrap">
                    <input id="buscar-estudiantes" type="search" maxLength={60} placeholder="Ej. Ana o Matemáticas"
                        aria-describedby="buscar-estudiantes-ayuda" value={texto} className={claseCampo}
                        onChange={evento => setTexto(evento.target.value)} />
                    <button type="submit" className={botonSocial}>Buscar</button>
                    {(texto || filtroActivo) && (
                        <button type="button" className={botonSocialSecundario} onClick={() => aplicarFiltros('', 'todos')}>
                            Limpiar
                        </button>
                    )}
                </div>
                <div role="group" aria-label="Filtrar por intereses" className="mt-4 flex flex-wrap gap-2">
                    {tipos.map(tipo => (
                        <button key={tipo.valor} type="button" aria-pressed={filtros.tipo === tipo.valor}
                            className={filtros.tipo === tipo.valor ? botonSocial : botonSocialSecundario}
                            onClick={() => aplicarFiltros(texto, tipo.valor)}>
                            {tipo.etiqueta}
                        </button>
                    ))}
                </div>
                <p id="buscar-estudiantes-ayuda" className="mt-3 text-sm text-slate-600">
                    Busca mientras escribes o selecciona una habilidad en una tarjeta para usarla como filtro.
                </p>
            </form>

            <section aria-labelledby="buscar-resultados-titulo" aria-busy={cargando}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 id="buscar-resultados-titulo" className="text-lg font-bold text-[#124277]">Resultados</h2>
                    {!cargando && !error && resultados && (
                        <p role="status" className="text-sm text-slate-600">
                            {resultados.total} {resultados.total === 1 ? 'estudiante' : 'estudiantes'}
                        </p>
                    )}
                </div>

                {cargando ? (
                    <div className="perfil-habilidades" role="status">
                        <p className="sr-only">Cargando estudiantes...</p>
                        {[0, 1].map(indice => (
                            <div key={indice} className={claseTarjeta}>
                                <Skeleton className="skeleton-titulo" />
                                <Skeleton className="skeleton-correo" />
                                <Skeleton className="skeleton-texto" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <ErrorSocial error="No se pudo cargar el directorio." reintentar={recargar} />
                ) : resultados?.data.length ? (
                    <div className="perfil-habilidades">
                        {resultados.data.map(estudiante => (
                            <TarjetaEstudiante key={estudiante.id} estudiante={estudiante} aplicarFiltros={aplicarFiltros} />
                        ))}
                    </div>
                ) : (
                    <div className={claseTarjeta}>
                        <h3 className="font-bold text-[#124277]">No encontramos estudiantes</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            {filtroActivo
                                ? 'Prueba con otro nombre o habilidad, o revisa los filtros.'
                                : 'Por ahora no hay otros estudiantes que hayan elegido aparecer en el directorio.'}
                        </p>
                        {filtroActivo && (
                            <button type="button" onClick={() => aplicarFiltros('', 'todos')} className={'mt-3 ' + botonSocialSecundario}>
                                Ver todos
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-4">
                    <PaginacionSocial datos={resultados} cambiarPagina={pagina => setFiltros(actual => ({ ...actual, pagina }))} />
                </div>
            </section>
        </div>
    );
}
