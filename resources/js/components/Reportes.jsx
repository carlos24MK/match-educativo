import { useState } from 'react';
import {
    botonSocial, CargaSocial, EncabezadoSocial, enviarSocial, ErrorSocial,
    PaginacionSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

export const categoriasReporte = { error: 'Error de la página', convivencia: 'Situación de convivencia', otro: 'Otro problema' };
export const estadosReporte = { pendiente: 'Pendiente', en_revision: 'En revisión', resuelto: 'Resuelto' };
const coloresEstado = {
    pendiente: 'bg-amber-100 text-amber-950',
    en_revision: 'bg-blue-100 text-blue-950',
    resuelto: 'bg-teal-100 text-teal-950',
};

export function EstadoReporte({ estado }) {
    if (!estadosReporte[estado]) return null;

    return (
        <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + coloresEstado[estado]}>
            {estadosReporte[estado]}
        </span>
    );
}

const inicial = { categoria: 'error', asunto: '', descripcion: '' };
const campo = 'mt-1 block w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-[#0b615a]';

export default function Reportes() {
    const [datos, setDatos] = useState(inicial);
    const [pagina, setPagina] = useState(1);
    const [enviando, setEnviando] = useState(false);
    const [referencia, setReferencia] = useState(null);
    const [error, setError] = useState('');
    const consulta = useConsultaSocial('/api/reportes?page=' + pagina);

    function cambiar(evento) {
        const { name, value } = evento.target;
        setDatos(actual => ({ ...actual, [name]: value }));
    }

    async function registrar(evento) {
        evento.preventDefault();
        setEnviando(true);
        setError('');
        setReferencia(null);
        try {
            const reporte = await enviarSocial('/api/reportes', datos);
            setReferencia(reporte.id);
            setDatos(inicial);
            if (pagina === 1) consulta.recargar();
            else setPagina(1);
        } catch (problema) {
            setError(problema.message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Cuéntanos qué pasó" etiqueta="Ayuda" icono="mensaje">
                Informa un error de la página o una situación que afecte a la comunidad. Puedes consultar tus reportes en esta misma sección.
            </EncabezadoSocial>
            <form onSubmit={registrar} className={tarjetaSocial}>
                <h2 className="text-xl font-bold">Nuevo reporte</h2>
                <fieldset disabled={enviando} className="mt-4 grid min-w-0 gap-4">
                    <legend className="sr-only">Detalles del reporte</legend>
                    <label className="text-sm font-semibold">Tipo de reporte
                        <select className={campo} name="categoria" value={datos.categoria} onChange={cambiar}>
                            {Object.entries(categoriasReporte).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                        </select>
                    </label>
                    <label className="text-sm font-semibold">Asunto
                        <input className={campo} name="asunto" required maxLength={120} value={datos.asunto} onChange={cambiar} />
                    </label>
                    <label className="text-sm font-semibold">Descripción
                        <textarea className={campo} name="descripcion" required minLength={10} maxLength={2000} rows={5}
                            aria-describedby="ayuda-reporte" value={datos.descripcion} onChange={cambiar} />
                    </label>
                    <p id="ayuda-reporte" className="text-sm text-slate-700">Indica la sección y qué sucedió. Evita incluir contraseñas o datos de contacto.</p>
                    <button type="submit" className={botonSocial + ' justify-self-start'}>{enviando ? 'Enviando…' : 'Enviar reporte'}</button>
                </fieldset>
                <p role="status" className="mt-3 text-sm font-semibold text-[#0b615a]">
                    {referencia && 'Reporte registrado. Tu referencia es #' + referencia + '.'}
                </p>
                {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
            </form>
            <section className={tarjetaSocial} aria-labelledby="mis-reportes">
                <h2 id="mis-reportes" className="mb-3 text-xl font-bold">Mis reportes</h2>
                {consulta.cargando ? <CargaSocial texto="Cargando tus reportes…" />
                    : consulta.error ? <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                    : consulta.datos.data.length === 0 ? <p className="text-sm text-slate-700">Todavía no has enviado reportes.</p>
                    : <ul className="divide-y divide-slate-200">
                        {consulta.datos.data.map(reporte => (
                            <li key={reporte.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                                <div className="min-w-0">
                                    <p className="font-semibold wrap-anywhere">{reporte.asunto}</p>
                                    <p className="text-sm text-slate-700">#{reporte.id} · {categoriasReporte[reporte.categoria]} · {reporte.created_at.slice(0, 10)}</p>
                                </div>
                                <EstadoReporte estado={reporte.estado} />
                            </li>
                        ))}
                    </ul>}
                {consulta.datos && <PaginacionSocial datos={consulta.datos} cambiarPagina={setPagina} />}
            </section>
        </div>
    );
}
