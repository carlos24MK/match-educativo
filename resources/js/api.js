export async function enviarFormulario(url, datos) {

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
        
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify(datos),
    });
}
