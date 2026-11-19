async function enviarConCsrf(url, opciones) {
    const preparacion = await fetch('/sanctum/csrf-cookie', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });

    if (!preparacion.ok) {
        throw new Error('No se pudo preparar la sesión.');
    }

    const cookie = document.cookie
        .split(';')
        .map(parte => parte.trim())
        .find(parte => parte.startsWith('XSRF-TOKEN='));

    if (!cookie) {
        throw new Error('No se encontró el token CSRF.');
    }

    const token = decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));

    return fetch(url, {
        ...opciones,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': token,
            ...opciones.headers,
        },
    });
}

export function enviarFormulario(url, datos) {
    return enviarConCsrf(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
}

export function enviarFotoPerfil(archivo) {
    const formulario = new FormData();
    formulario.append('foto', archivo);

    // El navegador incluye el límite multipart en Content-Type.
    return enviarConCsrf('/api/perfil/foto', { method: 'POST', body: formulario });
}

export function quitarFotoPerfil() {
    return enviarConCsrf('/api/perfil/foto', { method: 'DELETE' });
}
