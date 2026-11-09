import '../../css/inicio.css';

const pasos = [
    {
        icono: 'perfil',
        titulo: 'Crea tu perfil',
        descripcion: 'Preséntate y añade los temas que puedes enseñar y los que quieres aprender.',
    },
    {
        icono: 'buscar',
        titulo: 'Busca por habilidad',
        descripcion: 'Escribe un tema y elige si buscas a alguien que pueda enseñarlo o que quiera aprenderlo contigo.',
    },
    {
        icono: 'personas',
        titulo: 'Conecta y estudia en equipo',
        descripcion: 'Envía una solicitud. Cuando la otra persona la acepte, podrán conversar en privado y organizar cómo estudiar juntos.',
    },
];

const trazos = {
    perfil: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    buscar: 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M21 21l-4.4-4.4',
    personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 3.3a4 4 0 0 1 0 7.4 M22 21v-2a4 4 0 0 0-3-3.9',
    flecha: 'M4 12h15m-6-6 6 6-6 6',
    privacidad: 'M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10z M9 12l2 2 4-4',
};

const ancho = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const foco = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-700';
const botonPrimario = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#124277] px-5 py-3 font-semibold text-white hover:bg-[#0d325b] ' + foco;
const botonSecundario = 'inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-[#124277] hover:bg-blue-50 ' + foco;

function Icono({ tipo, className = 'size-5' }) {
    return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={trazos[tipo]} />
        </svg>
    );
}

function PerfilDeEjemplo({ nombre, ensena, aprende }) {
    return (
        <div className="flex min-w-0 flex-wrap items-start gap-3 rounded-xl border border-white/25 bg-white p-3.5 text-[#102f57] sm:p-4">
            <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-[#124277]">
                {nombre[0]}
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-bold">{nombre}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[#124277]">Enseña {ensena}</span>
                    <span className="rounded-md bg-cyan-50 px-2 py-1 text-[#125b69]">Quiere aprender {aprende}</span>
                </div>
            </div>
        </div>
    );
}

export default function Inicio() {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-3">
                Saltar al contenido
            </a>

            <header className="border-b border-slate-200 bg-white">
                <div className={ancho + ' flex min-h-20 items-center justify-between gap-3'}>
                    <a href="/" className={'shrink-0 rounded-lg ' + foco}>
                        <img src="/images/logo-match-educativo.webp" alt="Match Educativo, inicio"
                            width="1536" height="1024" className="h-auto w-28 sm:w-32" />
                    </a>
                    <nav aria-label="Navegación de inicio" className="flex flex-wrap items-center justify-end gap-3 sm:gap-6">
                        <a href="#como-funciona" className={'hidden rounded text-sm font-semibold text-[#124277] hover:underline sm:inline ' + foco}>
                            Cómo funciona
                        </a>
                        <a href="/login" className={'rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-[#124277] hover:bg-blue-50 sm:px-4 ' + foco}>
                            Iniciar sesión
                        </a>
                    </nav>
                </div>
            </header>

            <main id="contenido">
                <section className="inicio-hero border-b border-slate-200" aria-labelledby="inicio-titulo">
                    <div className={ancho + ' grid items-center gap-9 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20'}>
                        <div>
                            <p className="mb-4 text-xs font-bold tracking-[0.17em] text-[#126275] uppercase">
                                Aprendizaje entre estudiantes
                            </p>
                            <h1 id="inicio-titulo" className="max-w-xl text-4xl leading-[1.08] font-bold tracking-tight text-[#102f57] sm:text-5xl">
                                Comparte lo que sabes. Aprende de tus compañeros.
                            </h1>
                            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-700 sm:text-lg">
                                En Match Educativo puedes encontrar estudiantes de UniEspinal que enseñan lo que
                                quieres aprender o que comparten tus ganas de estudiar un tema.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <a href="/registro" className={botonPrimario}>Crear cuenta <Icono tipo="flecha" /></a>
                                <a href="#como-funciona" className={botonSecundario}>Cómo funciona</a>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">Tú eliges si tu perfil aparece en la búsqueda.</p>
                        </div>

                        <aside className="inicio-ejemplo rounded-3xl p-5 text-white shadow-lg sm:p-7" aria-labelledby="inicio-ejemplo-titulo">
                            <div className="relative">
                                <p className="text-xs font-semibold tracking-[0.15em] text-cyan-100 uppercase">Ejemplo de aprendizaje</p>
                                <h2 id="inicio-ejemplo-titulo" className="mt-2 text-2xl font-bold">Una habilidad en común</h2>
                                <div className="mt-5 grid gap-2.5">
                                    <PerfilDeEjemplo nombre="Ana" ensena="Excel" aprende="programación" />
                                    <PerfilDeEjemplo nombre="Luis" ensena="programación" aprende="Excel" />
                                </div>
                                <p className="mt-4 text-sm leading-relaxed text-blue-100">
                                    Si Ana busca quién enseña programación, puede encontrar el perfil de Luis.
                                </p>
                            </div>
                        </aside>
                    </div>
                </section>

                <section id="como-funciona" className={ancho + ' scroll-mt-6 py-12 sm:py-16'} aria-labelledby="inicio-pasos-titulo">
                    <h2 id="inicio-pasos-titulo" className="text-3xl font-bold tracking-tight text-[#102f57]">Cómo funciona</h2>
                    <p className="mt-2 max-w-xl text-slate-600">Empieza con lo que ya sabes y lo que te gustaría aprender.</p>
                    <ol className="mt-6 grid gap-4 md:grid-cols-3">
                        {pasos.map(({ icono, titulo, descripcion }, indice) => (
                            <li key={icono} className="inicio-paso rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#124277]">
                                        <Icono tipo={icono} />
                                    </span>
                                    <span aria-hidden="true" className="text-sm font-semibold text-[#126275]">0{indice + 1}</span>
                                </div>
                                <h3 className="mt-4 font-bold text-[#102f57]">{titulo}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{descripcion}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="bg-slate-50" aria-labelledby="inicio-privacidad-titulo">
                    <div className={ancho + ' flex flex-wrap items-center justify-between gap-6 py-9 sm:py-12'}>
                        <div className="flex max-w-2xl items-start gap-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-100 text-[#126275]">
                                <Icono tipo="privacidad" />
                            </span>
                            <div>
                                <h2 id="inicio-privacidad-titulo" className="text-xl font-bold text-[#102f57]">Tú decides qué compartes</h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                    Si activas la visibilidad de tu perfil, otros estudiantes con sesión iniciada podrán ver
                                    tu nombre, presentación y habilidades. Tu correo queda privado.
                                </p>
                            </div>
                        </div>
                        <a href="/registro" className={botonPrimario}>Empezar <Icono tipo="flecha" /></a>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200">
                <div className={ancho + ' flex flex-wrap items-center justify-between gap-2 py-5 text-sm text-slate-600'}>
                    <p className="font-semibold text-[#124277]">Match Educativo</p>
                    <p>Proyecto académico · UniEspinal</p>
                    <a href="https://github.com/carlos24MK/match-educativo"
                        className={'rounded font-semibold text-[#124277] underline underline-offset-4 ' + foco}>
                        Código fuente en GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}
