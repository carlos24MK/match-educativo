import { useEffect, useState } from 'react';
import { enviarFormulario } from '../api.js';
import Skeleton from './Skeleton.jsx';

export const tarjetaSocial = 'min-w-0 rounded-2xl border border-[#d7e4ed] bg-white p-5 shadow-[0_6px_18px_rgba(18,54,89,0.06)]';
export const listaSocial = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-4';
const baseBoton = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b766f] disabled:opacity-50';
export const botonSocial = baseBoton + ' bg-[#123659] px-4 text-white hover:bg-[#0a2947]';
export const botonSocialSecundario = baseBoton + ' border border-[#ccdce7] bg-white px-4 text-[#123659] hover:border-[#83c9c0] hover:bg-[#eefaf8]';
export const pestanaSocial = baseBoton + ' px-3 text-[#123659] hover:bg-white aria-pressed:bg-[#123659] aria-pressed:text-white';

const iconos = {
    personas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    conexion: 'M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6M14 11a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6',
    mensaje: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
    campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4',
    buscar: 'M20 20l-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
    flecha: 'M4 12h15m-6-6 6 6-6 6',
    telefono: 'M7 3h3l2 5-3 2a14 14 0 0 0 5 5l2-3 5 2v3a4 4 0 0 1-4 4C9.3 20.3 3.7 14.7 3 7a4 4 0 0 1 4-4Z',
    video: 'M3 6h13v12H3z M16 10l5-3v10l-5-3',
};

export function IconoSocial({ tipo }) {
    return (
        <svg aria-hidden="true" focusable="false" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconos[tipo]} />
        </svg>
    );
}

export function AvatarSocial({ nombre, fotoUrl }) {
    const [fotoFallida, setFotoFallida] = useState(null);
    const iniciales = nombre.trim().split(/\s+/).slice(0, 2)
        .map(palabra => Array.from(palabra)[0]).join('').toLocaleUpperCase('es');

    return (
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#bde5de] bg-linear-to-br from-[#dbf5f2] to-[#ebf2fb] text-sm font-extrabold text-[#123659]">
            {fotoUrl && fotoUrl !== fotoFallida
                ? <img src={fotoUrl} alt="" width={44} height={44} loading="lazy" onError={() => setFotoFallida(fotoUrl)}
                    className="size-full object-cover" />
                : iniciales}
        </span>
    );
}

const fechaSocial = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export function formatearFechaSocial(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? '' : fechaSocial.format(fecha);
}

async function leerRespuesta(respuesta) {
    if (respuesta.status === 401) {
        window.location.replace('/login');
        throw new Error('Tu sesión terminó.');
    }

    if (respuesta.status === 419) {
        throw new Error('Tu sesión necesita renovarse. Recarga la página e inténtalo de nuevo.');
    }

    if (respuesta.status === 429) {
        throw new Error('Espera un momento antes de intentarlo de nuevo.');
    }

    if (respuesta.status >= 500) {
        throw new Error('El servidor no pudo completar la operación. Inténtalo de nuevo.');
    }

    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
        const detalles = Object.values(datos?.errors ?? {}).flat().join(' ');
        const error = new Error(detalles || datos?.message || 'No pudimos completar la operación.');
        error.estado = respuesta.status;
        throw error;
    }

    if (!datos) throw new Error('El servidor devolvió una respuesta inesperada.');
    return datos;
}

export async function consultarSocial(url, signal) {
    const respuesta = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal,
    });
    return leerRespuesta(respuesta);
}

export async function enviarSocial(url, datos) {
    return leerRespuesta(await enviarFormulario(url, datos));
}

export function useConsultaSocial(url) {
    const [revision, setRevision] = useState(0);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        const controlador = new AbortController();
        consultarSocial(url, controlador.signal)
            .then(datos => {
                if (!controlador.signal.aborted) setResultado({ url, revision, datos, error: '' });
            })
            .catch(error => {
                if (!controlador.signal.aborted) {
                    setResultado({ url, revision, datos: null, error: error.message });
                }
            });
        return () => controlador.abort();
    }, [url, revision]);

    const vigente = resultado?.url === url && resultado.revision === revision;
    return {
        datos: vigente ? resultado.datos : null,
        error: vigente ? resultado.error : '',
        cargando: !vigente,
        recargar: () => setRevision(anterior => anterior + 1),
    };
}

export function EncabezadoSocial({ titulo, etiqueta, icono, detalle, children }) {
    return (
        <section className="perfil-resumen">
            <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 basis-72 items-start gap-3 sm:gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-[#c6f4ee] sm:size-12">
                        <IconoSocial tipo={icono} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-bold tracking-[0.14em] text-[#c6f4ee] uppercase">{etiqueta}</p>
                        <h2 className="mt-1 text-xl leading-tight font-extrabold tracking-tight text-white sm:text-2xl">{titulo}</h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">{children}</p>
                    </div>
                </div>
                {detalle && (
                    <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white">
                        {detalle}
                    </div>
                )}
            </div>
        </section>
    );
}

export function CargaSocial({ texto }) {
    return (
        <div role="status" className={listaSocial}>
            <p className="sr-only">{texto}</p>
            {[0, 1].map(indice => (
                <div key={indice} className={tarjetaSocial}>
                    <Skeleton className="skeleton-titulo" />
                    <Skeleton className="skeleton-correo" />
                </div>
            ))}
        </div>
    );
}

export function ErrorSocial({ error, reintentar }) {
    return (
        <div className={tarjetaSocial}>
            <p role="alert" className="text-sm font-medium text-red-800">{error}</p>
            {reintentar && (
                <button type="button" onClick={reintentar} className={'mt-3 ' + botonSocialSecundario}>
                    Volver a intentar
                </button>
            )}
        </div>
    );
}

export function PaginacionSocial({ datos, cambiarPagina, deshabilitada = false }) {
    if (!datos || datos.last_page <= 1) return null;

    return (
        <nav aria-label="Páginas de resultados" className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className={botonSocialSecundario}
                disabled={deshabilitada || datos.current_page <= 1}
                onClick={() => cambiarPagina(datos.current_page - 1)}>
                Anterior
            </button>
            <p className="text-sm text-slate-600">Página {datos.current_page} de {datos.last_page}</p>
            <button type="button" className={botonSocialSecundario}
                disabled={deshabilitada || datos.current_page >= datos.last_page}
                onClick={() => cambiarPagina(datos.current_page + 1)}>
                Siguiente
            </button>
        </nav>
    );
}
