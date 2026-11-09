import { useEffect, useState } from 'react';
import { enviarFormulario } from '../api.js';
import Skeleton from './Skeleton.jsx';

export const tarjetaSocial = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
export const botonSocial = 'inline-flex items-center justify-center rounded-lg bg-[#124277] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d325b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#124277] disabled:opacity-50';
export const botonSocialSecundario = 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#124277] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#124277] disabled:opacity-50';

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

export function EncabezadoSocial({ titulo, children }) {
    return (
        <section className="perfil-resumen">
            <div className="relative">
                <h2 className="text-xl font-bold text-white sm:text-2xl">{titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-blue-100">{children}</p>
            </div>
        </section>
    );
}

export function CargaSocial({ texto }) {
    return (
        <div role="status" className="space-y-3">
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
