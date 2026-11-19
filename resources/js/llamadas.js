import { useEffect, useRef, useState } from 'react';
import { consultarSocial, enviarSocial } from './components/SocialComun.jsx';

const ruta = '/api/llamadas';
const activas = ['pendiente', 'aceptada'];
const detener = flujo => flujo?.getTracks().forEach(pista => pista.stop());

function limpiarMedios(sesion) {
    clearTimeout(sesion?.limiteConexion);
    if (sesion?.peer) {
        sesion.peer.ontrack = null;
        sesion.peer.onicecandidate = null;
        sesion.peer.onconnectionstatechange = null;
        sesion.peer.close();
        sesion.peer = null;
    }
    detener(sesion?.flujo);
    if (sesion) sesion.flujo = null;
}

async function pedirMedios(tipo) {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('Abre Match Educativo mediante HTTPS en un navegador compatible con llamadas.');
    }

    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: tipo === 'video' ? { width: { ideal: 960 }, facingMode: 'user' } : false,
        });
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            throw new Error('Permite el acceso al micrófono y, para video, a la cámara en tu navegador.');
        }
        throw new Error('No pudimos abrir el micrófono o la cámara. Comprueba que estén disponibles.');
    }
}

// Envía la descripción con los candidatos reunidos para evitar una petición por cada candidato.
async function descripcionLocal(peer, descripcion) {
    await peer.setLocalDescription(descripcion);
    if (peer.iceGatheringState === 'complete') return peer.localDescription;

    await new Promise(resolve => {
        function terminar() {
            clearTimeout(limite);
            peer.removeEventListener('icegatheringstatechange', revisar);
            resolve();
        }
        function revisar() {
            if (peer.iceGatheringState === 'complete') terminar();
        }
        const limite = setTimeout(terminar, 5000);
        peer.addEventListener('icegatheringstatechange', revisar);
        revisar();
    });

    return peer.localDescription;
}

function avisarSalida(id) {
    const cookie = document.cookie.split('; ').find(valor => valor.startsWith('XSRF-TOKEN='));
    if (!cookie) return;
    fetch(ruta + '/' + id + '/responder', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)),
        },
        body: JSON.stringify({ accion: 'terminar' }),
    }).catch(() => {});
}

export function useLlamadas(tiempoRealConectado) {
    const [llamada, setLlamada] = useState(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const [estadoConexion, setEstadoConexion] = useState('');
    const [local, setLocal] = useState(null);
    const [remoto, setRemoto] = useState(null);
    const actual = useRef(null);
    const montado = useRef(false);
    const accionando = useRef(false);
    const conexionTiempoReal = useRef(false);
    const consultarAhora = useRef(null);
    const revision = useRef(0);

    useEffect(() => {
        conexionTiempoReal.current = tiempoRealConectado;
        if (tiempoRealConectado) consultarAhora.current?.();
    }, [tiempoRealConectado]);

    function vigente(sesion) {
        return montado.current && actual.current === sesion && activas.includes(sesion.llamada.estado);
    }

    function guardarSesion(datos, flujo = null) {
        const sesion = { llamada: datos, flujo, cursor: 0, peer: null, pendientes: [] };
        actual.current = sesion;
        setLlamada(datos);
        setLocal(flujo);
        setRemoto(null);
        setError('');
        setEstadoConexion('');
        return sesion;
    }

    function terminarMedios(sesion) {
        limpiarMedios(sesion);
        setLocal(null);
        setRemoto(null);
        setEstadoConexion('');
    }

    function aplicarEstado(sesion, datos) {
        if (sesion.llamada.estado === datos.estado) return;
        sesion.llamada = datos;
        setLlamada(datos);
        if (!activas.includes(datos.estado)) terminarMedios(sesion);
    }

    function fallarConexion(sesion, mensaje) {
        if (!vigente(sesion)) return;
        terminarMedios(sesion);
        sesion.llamada = { ...sesion.llamada, estado: 'terminada' };
        setLlamada(sesion.llamada);
        setError(mensaje);
        revision.current++;
        avisarSalida(sesion.llamada.id);
    }

    async function enviarDescripcion(sesion, descripcion) {
        const peer = sesion.peer;
        const local = await descripcionLocal(peer, descripcion);
        if (vigente(sesion) && sesion.peer === peer) {
            const envio = enviarSocial(ruta + '/' + sesion.llamada.id + '/senales', {
                tipo: local.type,
                datos: { sdp: local.sdp },
            });
            sesion.envioSenales = envio;
            await envio;
        }
    }

    async function conectar(sesion, iceServers) {
        const servidores = [{ urls: 'stun:stun.l.google.com:19302' }, ...(iceServers ?? [])];
        const peer = new RTCPeerConnection({ iceServers: servidores });
        sesion.peer = peer;
        for (const pista of sesion.flujo.getTracks()) peer.addTrack(pista, sesion.flujo);

        setEstadoConexion('Conectando…');
        const errorRed = 'No pudimos conectar la llamada. Comprueba la conexión e inténtalo de nuevo.';
        sesion.limiteConexion = setTimeout(() => fallarConexion(sesion, errorRed), 40000);

        peer.ontrack = evento => {
            if (vigente(sesion) && evento.streams[0]) setRemoto(evento.streams[0]);
        };
        // Si el relé tarda en responder, los candidatos posteriores al SDP viajan por separado.
        peer.onicecandidate = ({ candidate }) => {
            if (!candidate?.candidate || !sesion.envioSenales || !vigente(sesion)) return;
            sesion.envioSenales = sesion.envioSenales.then(() => {
                if (!vigente(sesion)) return;
                return enviarSocial(ruta + '/' + sesion.llamada.id + '/senales', {
                    tipo: 'ice', datos: candidate.toJSON(),
                });
            }).catch(() => {});
        };
        peer.onconnectionstatechange = () => {
            if (!vigente(sesion)) return;
            if (peer.connectionState === 'connected') {
                clearTimeout(sesion.limiteConexion);
                setEstadoConexion('En llamada');
            } else if (peer.connectionState === 'failed') {
                fallarConexion(sesion, errorRed);
            } else if (peer.connectionState === 'disconnected') {
                setEstadoConexion('Reconectando…');
                clearTimeout(sesion.limiteConexion);
                sesion.limiteConexion = setTimeout(() => fallarConexion(sesion, errorRed), 12000);
            }
        };
        if (sesion.llamada.es_iniciador) {
            const oferta = await peer.createOffer();
            if (vigente(sesion)) await enviarDescripcion(sesion, oferta);
        }
    }

    async function recibirSenales(sesion, senales) {
        const peer = sesion.peer;
        for (const senal of senales) {
            if (!vigente(sesion) || !peer) return;
            if (senal.id <= sesion.cursor) continue;

            if (senal.tipo === 'ice') {
                if (peer.remoteDescription) await peer.addIceCandidate(senal.datos);
                else sesion.pendientes.push(senal.datos);
            } else {
                await peer.setRemoteDescription({ type: senal.tipo, sdp: senal.datos.sdp });
                for (const candidato of sesion.pendientes) await peer.addIceCandidate(candidato);
                sesion.pendientes = [];
                if (senal.tipo === 'offer' && vigente(sesion)) {
                    const respuesta = await peer.createAnswer();
                    if (vigente(sesion)) await enviarDescripcion(sesion, respuesta);
                }
            }
            sesion.cursor = senal.id;
        }
    }

    useEffect(() => {
        montado.current = true;
        const controlador = new AbortController();
        let consultaEnCurso = false;
        let consultaPendiente = false;
        let reloj;

        async function revisar() {
            clearTimeout(reloj);
            if (controlador.signal.aborted) return;
            if (consultaEnCurso) {
                consultaPendiente = true;
                return;
            }

            const sesion = actual.current;
            const id = sesion && activas.includes(sesion.llamada.estado) ? sesion.llamada.id : null;
            const version = revision.current;
            consultaEnCurso = true;
            try {
                const respuesta = await consultarSocial(id ? ruta + '/' + id + '?despues=' + sesion.cursor : ruta,
                    controlador.signal);
                if (controlador.signal.aborted || revision.current !== version || !respuesta.data) return;

                if (!id && !accionando.current && respuesta.data.id !== sesion?.llamada.id) {
                    guardarSesion(respuesta.data);
                } else if (id && sesion === actual.current) {
                    aplicarEstado(sesion, respuesta.data);
                    if (sesion.llamada.estado === 'aceptada' && sesion.flujo) {
                        try {
                            if (!sesion.peer) await conectar(sesion, respuesta.ice_servers);
                            await recibirSenales(sesion, respuesta.senales ?? []);
                            if (respuesta.hay_mas_senales && vigente(sesion)) consultaPendiente = true;
                        } catch {
                            fallarConexion(sesion, 'Se interrumpió la conexión. Vuelve a iniciar la llamada.');
                        }
                    }
                }
            } catch (errorConsulta) {
                if (!controlador.signal.aborted && id && [403, 404].includes(errorConsulta.estado)) {
                    fallarConexion(sesion, 'Esta llamada ya no está disponible.');
                }
            } finally {
                consultaEnCurso = false;
                if (!controlador.signal.aborted) {
                    const hayLlamada = activas.includes(actual.current?.llamada.estado);
                    const pausa = hayLlamada ? 1800 : conexionTiempoReal.current ? 15000 : 6500;
                    reloj = setTimeout(revisar, consultaPendiente ? 0 : pausa);
                    consultaPendiente = false;
                }
            }
        }

        function salir() {
            const sesion = actual.current;
            if (!sesion || !activas.includes(sesion.llamada.estado)) return;
            if (sesion.flujo) avisarSalida(sesion.llamada.id);
            terminarMedios(sesion);
        }

        consultarAhora.current = revisar;
        window.addEventListener('llamada-tiempo-real', revisar);
        window.addEventListener('pagehide', salir);
        document.addEventListener('visibilitychange', revisar);
        revisar();
        return () => {
            montado.current = false;
            controlador.abort();
            clearTimeout(reloj);
            limpiarMedios(actual.current);
            window.removeEventListener('llamada-tiempo-real', revisar);
            window.removeEventListener('pagehide', salir);
            document.removeEventListener('visibilitychange', revisar);
        };
    }, []);

    async function ejecutar(operacion) {
        if (accionando.current) return;
        accionando.current = true;
        setOcupado(true);
        setError('');
        try {
            await operacion();
        } catch (errorAccion) {
            if (montado.current) setError(errorAccion.message);
        } finally {
            accionando.current = false;
            if (montado.current) {
                setOcupado(false);
                consultarAhora.current?.();
            }
        }
    }

    function iniciar(matchId, tipo) {
        return ejecutar(async () => {
            if (activas.includes(actual.current?.llamada.estado)) return;
            const flujo = await pedirMedios(tipo);
            try {
                if (!montado.current) return detener(flujo);
                const { data } = await enviarSocial('/api/matches/' + matchId + '/llamadas', { tipo });
                if (!montado.current) {
                    detener(flujo);
                    avisarSalida(data.id);
                    return;
                }
                revision.current++;
                guardarSesion(data, flujo);
            } catch (error) {
                detener(flujo);
                throw error;
            }
        });
    }

    function responder(accion) {
        return ejecutar(async () => {
            const sesion = actual.current;
            if (!sesion || !vigente(sesion)) return;
            const flujo = accion === 'aceptar' ? await pedirMedios(sesion.llamada.tipo) : null;
            try {
                if (!vigente(sesion)) return detener(flujo);
                const { data } = await enviarSocial(ruta + '/' + sesion.llamada.id + '/responder', { accion });
                if (!montado.current || actual.current !== sesion) {
                    detener(flujo);
                    if (accion === 'aceptar') avisarSalida(sesion.llamada.id);
                    return;
                }
                revision.current++;
                if (flujo && activas.includes(data.estado)) {
                    sesion.flujo = flujo;
                    setLocal(flujo);
                } else {
                    detener(flujo);
                }
                aplicarEstado(sesion, data);
            } catch (error) {
                detener(flujo);
                if (accion === 'terminar' && vigente(sesion)) {
                    fallarConexion(sesion, 'Cerraste la llamada. Se perdió la conexión con el servidor.');
                    return;
                }
                throw error;
            }
        });
    }

    function cerrarAviso() {
        actual.current = null;
        revision.current++;
        setLlamada(null);
        setError('');
        consultarAhora.current?.();
    }

    return { llamada, local, remoto, estadoConexion, ocupado, error, iniciar, responder, cerrarAviso };
}
