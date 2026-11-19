import '../../css/inicio.css';
import Marca from './Marca.jsx';

const pasos = [
    {
        icono: 'perfil',
        titulo: 'Cuéntanos qué sabes',
        descripcion: 'Crea tu perfil, indica qué puedes enseñar, qué quieres aprender y cuándo tienes tiempo para estudiar.',
        colores: 'bg-[#e6effa] text-[#124277]',
    },
    {
        icono: 'buscar',
        titulo: 'Encuentra compañeros',
        descripcion: 'Encuentra personas por nombre, habilidades complementarias u horarios en común.',
        colores: 'bg-[#dbf5f2] text-[#0b615a]',
    },
    {
        icono: 'personas',
        titulo: 'Hagan un match',
        descripcion: 'Envía una solicitud. Si la aceptan, pueden conversar en privado y organizar sesiones o grupos de estudio.',
        colores: 'bg-[#fcf0d9] text-[#795017]',
    },
];

const trazos = {
    perfil: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    buscar: 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M21 21l-4.4-4.4',
    personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 3.3a4 4 0 0 1 0 7.4 M22 21v-2a4 4 0 0 0-3-3.9',
    flecha: 'M4 12h15m-6-6 6 6-6 6',
    reproducir: 'M8 5l12 7-12 7z',
    intercambio: 'M4 8h15m-4-4 4 4-4 4 M20 16H5m4-4-4 4 4 4',
    privacidad: 'M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10z M9 12l2 2 4-4',
};

const ancho = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const foco = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b766f]';
const botonPrimario = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123659] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0b615a] ' + foco;
const botonSecundario = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8ccd9] bg-white px-5 py-3 text-sm font-bold text-[#123659] transition-colors hover:bg-[#dbf5f2] ' + foco;

function Icono({ tipo, className = 'size-5' }) {
    return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={trazos[tipo]} />
        </svg>
    );
}

function PerfilDeEjemplo({ nombre, ensena, aprende, colores }) {
    return (
        <li className="min-w-0 rounded-2xl border border-white/60 bg-white p-3.5 text-[#10233d] sm:p-4">
            <div className="flex flex-wrap items-center gap-2.5">
                <span aria-hidden="true" className={'grid size-9 shrink-0 place-items-center rounded-xl font-bold ' + colores}>
                    {nombre[0]}
                </span>
                <p className="font-bold">{nombre}</p>
            </div>
            <dl className="mt-3 grid gap-2.5 border-t border-slate-200 pt-3 text-sm">
                <div>
                    <dt className="text-xs text-slate-600">Enseña</dt>
                    <dd className="font-semibold wrap-anywhere">{ensena}</dd>
                </div>
                <div>
                    <dt className="text-xs text-slate-600">Quiere aprender</dt>
                    <dd className="font-semibold wrap-anywhere text-[#0b615a]">{aprende}</dd>
                </div>
            </dl>
        </li>
    );
}

export default function Inicio() {
    return (
        <div className="min-h-dvh bg-white text-[#10233d]">
            <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">
                Saltar al contenido
            </a>

            <header className="border-b border-[#dce7ef] bg-white">
                <div className={ancho + ' flex min-h-18 items-center justify-between gap-3 py-1'}>
                    <a href="/" aria-label="Match Educativo, inicio" className={'min-w-0 rounded-lg ' + foco}>
                        <Marca />
                    </a>
                    <nav aria-label="Navegación de inicio" className="flex items-center justify-end gap-3 sm:gap-5">
                        <a href="#como-funciona" className={'hidden rounded text-sm font-semibold text-[#123659] hover:underline sm:inline ' + foco}>
                            Cómo funciona
                        </a>
                        <a href="/login" className={botonSecundario}>Iniciar sesión</a>
                    </nav>
                </div>
            </header>

            <main id="contenido" tabIndex={-1}>
                <section className="inicio-hero border-b border-[#dce7ef]" aria-labelledby="inicio-titulo">
                    <div className={ancho + ' grid items-center gap-7 py-9 sm:py-11 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:py-12'}>
                        <div>
                            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c5e3df] bg-[#dbf5f2] px-3 py-1.5 text-xs font-bold text-[#0b615a]">
                                <span className="size-2 rounded-full bg-[#0b766f]" aria-hidden="true" />
                                Comunidad de aprendizaje · UniEspinal
                            </p>
                            <h1 id="inicio-titulo" className="text-[clamp(2.5rem,5.2vw,4.5rem)] leading-[1.03] font-bold tracking-[-0.055em]">
                                Aprende mejor <span className="block text-[#0b766f]">en compañía.</span>
                            </h1>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#344b62] sm:text-lg">
                                Comparte lo que sabes y encuentra con quién estudiar sin pagar una tarifa.
                                Una comunidad para estudiantes, aprendices y personas autodidactas de El Espinal y sus alrededores.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <a href="/registro" className={botonPrimario}>Crear cuenta <Icono tipo="flecha" /></a>
                                <a href="#video-promocional" className={botonSecundario}><Icono tipo="reproducir" /> Ver video</a>
                            </div>
                            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-[#344b62]">
                                <Icono tipo="privacidad" className="size-4 shrink-0 text-[#0b615a]" />
                                Tú eliges si tu perfil aparece en la búsqueda.
                            </p>
                        </div>

                        <figure className="inicio-ejemplo rounded-3xl border border-[#163e59] p-4 text-white sm:p-6" aria-labelledby="inicio-ejemplo-titulo">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#dbf5f2]">
                                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#f0bd66]" />
                                    Ejemplo ilustrativo
                                </span>
                                <span aria-hidden="true" className="font-mono text-xs tracking-[0.15em] text-[#b9ddd9]">01 / MATCH</span>
                            </div>
                            <h2 id="inicio-ejemplo-titulo" className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                                Dos estudiantes, un intercambio
                            </h2>
                            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="Perfiles de ejemplo">
                                <PerfilDeEjemplo nombre="Ana" ensena="Excel" aprende="Programación" colores="bg-[#e6effa] text-[#124277]" />
                                <PerfilDeEjemplo nombre="Luis" ensena="Programación" aprende="Excel" colores="bg-[#dbf5f2] text-[#0b615a]" />
                            </ul>
                            <figcaption className="mt-3 flex items-center gap-3 rounded-xl border border-white/20 bg-[#123659] px-3 py-2.5 text-sm leading-snug text-[#e7f6f5]">
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f0bd66] text-[#10233d]">
                                    <Icono tipo="intercambio" className="size-4" />
                                </span>
                                Ana puede encontrar a Luis al buscar quién enseña programación.
                            </figcaption>
                        </figure>
                    </div>
                </section>

                <section id="video-promocional" className={ancho + ' scroll-mt-6 py-9 sm:py-11'} aria-labelledby="inicio-video-titulo">
                    <div className="grid items-center gap-5 rounded-3xl border border-[#dce7ef] bg-[#f8fafc] p-4 sm:p-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-8 lg:p-8">
                        <div>
                            <h2 id="inicio-video-titulo" className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Conoce Match Educativo
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#344b62] sm:text-base">
                                Mira cómo crear tu perfil, encontrar compañeros de estudio y empezar a aprender juntos.
                            </p>
                            <a href="/match-educativo-video.html" target="_blank" rel="noopener"
                                className={'mt-4 inline-block rounded text-sm font-semibold text-[#0b615a] underline underline-offset-4 ' + foco}>
                                Abrir el video en otra pestaña
                            </a>
                        </div>
                        <div className="inicio-video min-w-0">
                            <iframe title="Video promocional de Match Educativo"
                                src="/match-educativo-video.html" loading="lazy" sandbox="allow-scripts" />
                        </div>
                    </div>
                </section>

                <section id="como-funciona" className={ancho + ' scroll-mt-6 py-9 sm:py-11'} aria-labelledby="inicio-pasos-titulo">
                    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-[#0b615a] uppercase">Cómo funciona</p>
                            <h2 id="inicio-pasos-titulo" className="mt-1 text-3xl font-bold tracking-tight">Así empieza un match</h2>
                        </div>
                        <p className="max-w-sm text-sm leading-relaxed text-[#344b62]">
                            Parte de lo que ya sabes y encuentra a alguien con quien dar el siguiente paso.
                        </p>
                    </div>
                    <ol className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-3">
                        {pasos.map(({ icono, titulo, descripcion, colores }, indice) => (
                            <li key={icono} className="inicio-paso rounded-2xl border border-[#dce7ef] bg-[#f8fafc] p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={'grid size-10 place-items-center rounded-xl ' + colores}>
                                        <Icono tipo={icono} />
                                    </span>
                                    <span aria-hidden="true" className="font-mono text-xs font-bold tracking-wide text-[#0b615a]">0{indice + 1}</span>
                                </div>
                                <h3 className="mt-3 font-bold">{titulo}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-[#344b62]">{descripcion}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="border-y border-[#dce7ef] bg-[#eef4f8]" aria-labelledby="inicio-privacidad-titulo">
                    <div className={ancho + ' flex flex-wrap items-center justify-between gap-4 py-6 sm:py-7'}>
                        <div className="flex max-w-2xl items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dbf5f2] text-[#0b615a]">
                                <Icono tipo="privacidad" />
                            </span>
                            <div>
                                <h2 id="inicio-privacidad-titulo" className="text-lg font-bold">Tú decides qué compartes</h2>
                                <p className="mt-1 text-sm leading-relaxed text-[#344b62]">
                                    Si activas la visibilidad de tu perfil, otros miembros podrán ver tu nombre, foto, habilidades
                                    y los datos de estudio que compartas. También podrán comprobar si tienen horarios en común contigo. Tu correo queda privado.
                                </p>
                            </div>
                        </div>
                        <a href="/registro" className={botonPrimario}>Empezar <Icono tipo="flecha" /></a>
                    </div>
                </section>
            </main>

            <footer>
                <div className={ancho + ' flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-5 text-sm text-[#344b62]'}>
                    <div>
                        <p className="font-bold text-[#123659]">Match Educativo</p>
                        <p>Conecta, comparte y aprende</p>
                    </div>
                    <p>Proyecto académico · UniEspinal · El Espinal, Tolima</p>
                    <a href="https://github.com/carlos24MK/match-educativo"
                        className={'rounded font-semibold text-[#123659] underline underline-offset-4 ' + foco}>
                        Código fuente en GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}
