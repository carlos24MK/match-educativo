import { useEffect, useRef, useState } from 'react';
import { AvatarSocial, botonSocial, botonSocialSecundario } from './SocialComun.jsx';

const cerradas = {
    rechazada: 'La llamada fue rechazada.',
    terminada: 'La llamada terminó.',
    expirada: 'La llamada expiró.',
};

function VistaMedios({ flujo, video, propio = false }) {
    const elemento = useRef(null);
    const [requiereReproducir, setRequiereReproducir] = useState(false);

    useEffect(() => {
        const medio = elemento.current;
        let vigente = true;
        medio.srcObject = flujo;
        if (flujo) {
            medio.play().catch(() => {
                if (vigente) setRequiereReproducir(true);
            });
        }
        return () => {
            vigente = false;
            medio.srcObject = null;
        };
    }, [flujo]);

    async function reproducir() {
        try {
            await elemento.current.play();
            setRequiereReproducir(false);
        } catch {
            setRequiereReproducir(true);
        }
    }

    return (
        <>
            {video ? (
                <video ref={elemento} autoPlay playsInline muted={propio}
                    aria-label={propio ? 'Vista previa de tu cámara' : 'Video de la otra persona'}
                    className={'aspect-video w-full rounded-xl bg-[#10233d] object-contain' + (propio ? ' -scale-x-100' : '')} />
            ) : <audio ref={elemento} autoPlay />}
            {requiereReproducir && flujo && !propio && (
                <button type="button" className={'mt-2 ' + botonSocialSecundario} onClick={reproducir}>
                    Reproducir audio de la llamada
                </button>
            )}
        </>
    );
}

export default function DialogoLlamada({ control }) {
    const { llamada, local, remoto, estadoConexion, ocupado, error, responder, cerrarAviso } = control;
    const dialogo = useRef(null);
    const [silenciado, setSilenciado] = useState(false);
    const [camaraApagada, setCamaraApagada] = useState(false);
    const video = llamada.tipo === 'video';
    const aviso = cerradas[llamada.estado];
    const entrante = llamada.estado === 'pendiente' && !llamada.es_iniciador;
    const otroDispositivo = llamada.estado === 'aceptada' && !local;
    const estado = aviso ?? (entrante ? 'Llamada entrante'
        : llamada.estado === 'pendiente' ? 'Esperando respuesta…'
            : otroDispositivo ? 'La llamada está abierta en otra pestaña o dispositivo.'
                : estadoConexion || 'Conectando…');

    useEffect(() => {
        const ventana = dialogo.current;
        ventana.showModal();
        return () => ventana.close();
    }, []);

    function cambiarMicrofono() {
        for (const pista of local?.getAudioTracks() ?? []) pista.enabled = silenciado;
        setSilenciado(!silenciado);
    }

    function cambiarCamara() {
        for (const pista of local?.getVideoTracks() ?? []) pista.enabled = camaraApagada;
        setCamaraApagada(!camaraApagada);
    }

    return (
        <dialog ref={dialogo} aria-labelledby="llamada-titulo" aria-describedby="llamada-estado"
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-[#10233d] shadow-2xl backdrop:bg-slate-950/65 sm:p-6"
            onCancel={evento => {
                evento.preventDefault();
                if (aviso) cerrarAviso();
            }}>
            <div className="flex items-center gap-3">
                <AvatarSocial nombre={llamada.estudiante.nombre} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0b615a]">{video ? 'Videollamada' : 'Llamada de voz'}</p>
                    <h2 id="llamada-titulo" className="text-xl font-bold wrap-anywhere">{llamada.estudiante.nombre}</h2>
                </div>
            </div>

            <p id="llamada-estado" role="status" className="mt-3 text-sm font-medium text-slate-700">{estado}</p>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{error}</p>}
            {video && (local || remoto) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
                    {remoto && <VistaMedios flujo={remoto} video />}
                    {local && <VistaMedios flujo={local} video propio />}
                </div>
            )}
            {!video && remoto && <VistaMedios flujo={remoto} video={false} />}

            <div className="mt-5 flex flex-wrap items-center gap-2">
                {aviso ? (
                    <button type="button" onClick={cerrarAviso} className={botonSocial}>Cerrar</button>
                ) : entrante ? (
                    <>
                        <button type="button" autoFocus disabled={ocupado} className={botonSocial}
                            onClick={() => responder('aceptar')}>Aceptar</button>
                        <button type="button" disabled={ocupado} className={botonSocialSecundario}
                            onClick={() => responder('rechazar')}>Rechazar</button>
                    </>
                ) : (
                    <>
                        {local && (
                            <button type="button" aria-pressed={silenciado} onClick={cambiarMicrofono}
                                className={botonSocialSecundario}>
                                {silenciado ? 'Activar micrófono' : 'Silenciar micrófono'}
                            </button>
                        )}
                        {local && video && (
                            <button type="button" aria-pressed={camaraApagada} onClick={cambiarCamara}
                                className={botonSocialSecundario}>
                                {camaraApagada ? 'Encender cámara' : 'Apagar cámara'}
                            </button>
                        )}
                        <button type="button" disabled={ocupado} onClick={() => responder('terminar')}
                            className={botonSocial + ' bg-red-700 hover:bg-red-800'}>
                            {llamada.estado === 'pendiente' ? 'Cancelar llamada' : 'Colgar'}
                        </button>
                    </>
                )}
            </div>
        </dialog>
    );
}
