import { useState } from 'react';
import { categoriasReporte, EstadoReporte, estadosReporte } from './Reportes.jsx';
import {
    botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial,
    enviarSocial, ErrorSocial, formatearFechaSocial, PaginacionSocial, pestanaSocial,
    tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

const filtros = [
    ['todos', 'Todos'],
    ['pendiente', 'Pendientes'],
    ['en_revision', 'En revisión'],
    ['resuelto', 'Resueltos'],
];

const acciones = {
    pendiente: [
        { estado: 'en_revision', texto: 'Iniciar revisión' },
        { estado: 'resuelto', texto: 'Marcar resuelto' },
    ],
    en_revision: [{ estado: 'resuelto', texto: 'Marcar resuelto' }],
    resuelto: [{ estado: 'pendiente', texto: 'Reabrir reporte' }],
};

function ReporteAdministrativo({ reporte, procesando, actualizarEstado }) {
    return (
        <li className={tarjetaSocial}>
            <article aria-labelledby={'reporte-' + reporte.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-600">
                            #{reporte.id} · {categoriasReporte[reporte.categoria] ?? 'Reporte'}
                        </p>
                        <h3 id={'reporte-' + reporte.id} className="mt-1 text-lg font-bold wrap-anywhere text-[#10233d]">
                            {reporte.asunto}
                        </h3>
                    </div>
                    <EstadoReporte estado={reporte.estado} />
                </div>

                <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-slate-800">{reporte.descripcion}</p>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
                    <div className="min-w-0">
                        <dt className="font-semibold">Enviado por</dt>
                        <dd className="wrap-anywhere">{reporte.reportado_por?.nombre ?? 'Cuenta no disponible'}</dd>
                    </div>
                    {reporte.creado_en && (
                        <div>
                            <dt className="font-semibold">Fecha de envío</dt>
                            <dd><time dateTime={reporte.creado_en}>{formatearFechaSocial(reporte.creado_en)}</time></dd>
                        </div>
                    )}
                    {reporte.revisado_por && (
                        <div className="min-w-0">
                            <dt className="font-semibold">Última revisión</dt>
                            <dd className="wrap-anywhere">{reporte.revisado_por.nombre}</dd>
                        </div>
                    )}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {acciones[reporte.estado]?.map((accion, indice) => (
                        <button type="button" key={accion.estado} disabled={procesando}
                            className={indice === 0 ? botonSocial : botonSocialSecundario}
                            onClick={() => actualizarEstado(reporte.id, accion.estado)}>
                            {accion.texto}
                        </button>
                    ))}
                </div>
            </article>
        </li>
    );
}

export default function Administracion() {
    const [estado, setEstado] = useState('todos');
    const [pagina, setPagina] = useState(1);
    const [referencia, setReferencia] = useState(() => {
        const valor = new URLSearchParams(window.location.search).get('reporte');
        return /^[1-9][0-9]{0,17}$/.test(valor ?? '') ? valor : null;
    });
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [errorAccion, setErrorAccion] = useState('');
    const filtrosConsulta = new URLSearchParams({ page: pagina });
    if (referencia) filtrosConsulta.set('reporte', referencia);
    if (estado !== 'todos') filtrosConsulta.set('estado', estado);
    const consulta = useConsultaSocial('/api/administracion/reportes?' + filtrosConsulta);
    const resumen = consulta.datos?.resumen;

    function filtrar(nuevoEstado) {
        if (referencia) {
            const url = new URL(window.location.href);
            url.searchParams.delete('reporte');
            window.history.replaceState(null, '', url);
            setReferencia(null);
        }

        setEstado(nuevoEstado);
        setPagina(1);
        setMensaje('');
        setErrorAccion('');
    }

    async function actualizarEstado(id, siguienteEstado) {
        setProcesando(true);
        setMensaje('');
        setErrorAccion('');
        try {
            const resultado = await enviarSocial('/api/administracion/reportes/' + id, { estado: siguienteEstado });
            setMensaje('Se actualizó el estado del reporte #' + id + ' a «' + estadosReporte[resultado.data.estado] + '».');
            if (pagina > 1 && estado !== 'todos' && consulta.datos?.data.length === 1) {
                setPagina(pagina - 1);
            } else {
                consulta.recargar();
            }
        } catch (error) {
            setErrorAccion(error.message);
        } finally {
            setProcesando(false);
        }
    }

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Gestiona los reportes" etiqueta="Administración" icono="campana">
                Revisa los reportes de la comunidad, registra su estado y consulta cuáles siguen pendientes.
            </EncabezadoSocial>

            {resumen && (
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        ['Pendientes', resumen.pendiente],
                        ['En revisión', resumen.en_revision],
                        ['Resueltos', resumen.resuelto],
                        ['Cuentas registradas', resumen.usuarios],
                    ].map(([etiqueta, cantidad]) => (
                        <div key={etiqueta} className={tarjetaSocial + ' px-4 py-3'}>
                            <dt className="text-sm font-semibold text-slate-700">{etiqueta}</dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums text-[#10233d]">{cantidad}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <section className={tarjetaSocial} aria-labelledby="bandeja-reportes">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="bandeja-reportes" className="text-lg font-bold text-[#10233d]">
                        {referencia ? 'Reporte #' + referencia : 'Bandeja de reportes'}
                    </h2>
                    <button type="button" onClick={consulta.recargar} disabled={procesando || consulta.cargando}
                        className={botonSocialSecundario}>
                        Actualizar
                    </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Filtrar reportes por estado">
                    {filtros.map(([valor, etiqueta]) => (
                        <button type="button" className={pestanaSocial} key={valor}
                            aria-pressed={!referencia && estado === valor} disabled={procesando}
                            onClick={() => filtrar(valor)}>
                            {etiqueta}
                        </button>
                    ))}
                </div>
            </section>

            <p role="status" className={mensaje ? 'rounded-xl bg-teal-50 p-3 text-sm text-teal-900' : 'sr-only'}>{mensaje}</p>
            {errorAccion && <ErrorSocial error={errorAccion} />}

            {consulta.cargando ? <CargaSocial texto="Cargando reportes…" />
                : consulta.error ? <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                : consulta.datos.data.length === 0 ? (
                    <p className={tarjetaSocial + ' text-sm text-slate-700'}>
                        {referencia ? 'Este reporte no está disponible.' : 'No hay reportes en esta vista.'}
                    </p>
                ) : (
                    <ul className="grid gap-3" aria-label="Reportes de la comunidad">
                        {consulta.datos.data.map(reporte => (
                            <ReporteAdministrativo key={reporte.id} reporte={reporte} procesando={procesando}
                                actualizarEstado={actualizarEstado} />
                        ))}
                    </ul>
                )}

            <PaginacionSocial datos={consulta.datos} cambiarPagina={setPagina} deshabilitada={procesando} />
        </div>
    );
}
