import { useRef, useState } from 'react';
import {
    botonSocial, botonSocialSecundario, CargaSocial, EncabezadoSocial, enviarSocial,
    ErrorSocial, tarjetaSocial, useConsultaSocial,
} from './SocialComun.jsx';

export const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const campo = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-400 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#0b615a]';

function EditorHorario({ inicial }) {
    const siguienteId = useRef(inicial.length);
    const [horarios, setHorarios] = useState(() => inicial.map((bloque, id) => ({ ...bloque, id })));
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [error, setError] = useState('');

    function actualizar(id, cambios) {
        setHorarios(actual => actual.map(bloque => bloque.id === id ? { ...bloque, ...cambios } : bloque));
        setAviso('');
    }

    function agregar() {
        const id = siguienteId.current++;
        setHorarios(actual => [...actual, { id, dia: 1, inicio: '', fin: '' }]);
        setAviso('');
    }

    async function guardar(evento) {
        evento.preventDefault();
        setGuardando(true);
        setAviso('');
        setError('');

        try {
            const { data } = await enviarSocial('/api/horarios', {
                horarios: horarios.map(({ dia, inicio, fin }) => ({ dia, inicio, fin })),
            });
            setHorarios(data.map((bloque, indice) => ({ ...bloque, id: horarios[indice].id })));
            setAviso('Tu disponibilidad quedó guardada.');
        } catch (problema) {
            setError(problema.message);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form className={tarjetaSocial} onSubmit={guardar}>
            <h2 className="text-xl font-bold">Disponibilidad semanal</h2>
            <p className="mt-2 text-sm text-slate-700" id="horario-ayuda">
                Usa la hora de Colombia. Añade un bloque por cada periodo en el que puedas estudiar.
                Tus matches aceptados pueden ver estos bloques.
            </p>
            <fieldset disabled={guardando} aria-describedby="horario-ayuda" className="mt-4 min-w-0 space-y-3">
                <legend className="sr-only">Bloques de disponibilidad</legend>
                {horarios.length === 0 && <p className="text-sm text-slate-700">Todavía no tienes horarios guardados.</p>}
                {horarios.map((bloque, indice) => (
                    <fieldset key={bloque.id} className="min-w-0 rounded-xl border border-slate-300 p-3">
                        <legend className="px-1 text-sm font-semibold">Bloque {indice + 1}</legend>
                        <div className="grid items-end gap-3 sm:grid-cols-3">
                            <label className="text-sm font-semibold">Día
                                <select className={campo} value={bloque.dia}
                                    onChange={evento => actualizar(bloque.id, { dia: Number(evento.target.value) })}>
                                    {diasSemana.map((dia, posicion) => <option key={dia} value={posicion + 1}>{dia}</option>)}
                                </select>
                            </label>
                            <label className="text-sm font-semibold">Desde
                                <input className={campo} type="time" required value={bloque.inicio}
                                    onInput={evento => actualizar(bloque.id, { inicio: evento.currentTarget.value })} />
                            </label>
                            <label className="text-sm font-semibold">Hasta
                                <input className={campo} type="time" required value={bloque.fin}
                                    onInput={evento => actualizar(bloque.id, { fin: evento.currentTarget.value })} />
                            </label>
                        </div>
                        <button type="button" aria-label={'Quitar bloque ' + (indice + 1)} className={'mt-3 ' + botonSocialSecundario}
                            onClick={() => { setHorarios(actual => actual.filter(item => item.id !== bloque.id)); setAviso(''); }}>
                            Quitar bloque
                        </button>
                    </fieldset>
                ))}
                <div className="flex flex-wrap gap-3">
                    <button type="button" className={botonSocialSecundario} onClick={agregar} disabled={horarios.length >= 14}>Añadir horario</button>
                    <button type="submit" className={botonSocial}>{guardando ? 'Guardando…' : 'Guardar horarios'}</button>
                </div>
            </fieldset>
            <p role="status" className="mt-3 text-sm font-semibold text-[#0b615a]">{aviso}</p>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{error}</p>}
        </form>
    );
}

export default function Horarios() {
    const consulta = useConsultaSocial('/api/horarios');

    return (
        <div className="perfil-contenido mt-5 space-y-4">
            <EncabezadoSocial titulo="Organiza tus sesiones" etiqueta="Disponibilidad" icono="personas">
                Indica cuándo puedes estudiar. El filtro de horarios usa tus bloques para encontrar personas disponibles al mismo tiempo.
            </EncabezadoSocial>
            {consulta.cargando ? <CargaSocial texto="Cargando tus horarios…" />
                : consulta.error ? <ErrorSocial error={consulta.error} reintentar={consulta.recargar} />
                : <EditorHorario inicial={consulta.datos.data} />}
            <a className={botonSocialSecundario} href="/buscar-estudiantes?horario_comun=1">Buscar personas con horarios en común</a>
        </div>
    );
}
