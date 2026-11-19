<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /** Aplica defensas del navegador y evita almacenar páginas de autenticación. */
    public function handle(Request $request, Closure $next): Response
    {
        Vite::useCspNonce();
        $respuesta = $next($request);
        $desarrollo = $this->origenVite();
        $conexiones = ["'self'"];

        if ($desarrollo !== '') {
            $conexiones[] = $desarrollo;
            $conexiones[] = preg_replace('/^http/', 'ws', $desarrollo);
        }

        $cluster = config('services.pusher.cluster');
        if (config('services.pusher.key') && is_string($cluster) && preg_match('/\A[a-z0-9]+\z/', $cluster)) {
            $conexiones[] = "wss://ws-{$cluster}.pusher.com";
            $conexiones[] = "https://sockjs-{$cluster}.pusher.com";
        }

        $politica = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'nonce-".Vite::cspNonce()."' ".$desarrollo,
            "style-src 'self' 'unsafe-inline' ".$desarrollo,
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "font-src 'self' data:",
            'connect-src '.implode(' ', $conexiones),
        ];

        $respuesta->headers->set('Content-Security-Policy', implode('; ', $politica));
        $respuesta->headers->set('X-Content-Type-Options', 'nosniff');
        $respuesta->headers->set('X-Frame-Options', 'DENY');
        $respuesta->headers->set('Referrer-Policy', 'same-origin');
        $permisoMedios = $request->routeIs(
            'dashboard', 'perfil', 'buscar-estudiantes', 'matches', 'mensajes',
            'notificaciones', 'horarios', 'reportes', 'seguridad', 'administracion'
        ) ? '(self)' : '()';
        $respuesta->headers->set('Permissions-Policy', "camera={$permisoMedios}, microphone={$permisoMedios}, geolocation=()");

        if ($request->isSecure()) {
            $respuesta->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        if ($request->is('api/*', 'login', 'registro', 'dashboard', 'perfil', 'buscar-estudiantes', 'matches', 'mensajes', 'notificaciones', 'horarios', 'reportes', 'administracion', 'configuracion/*', 'recuperar-contrasena')) {
            $respuesta->headers->set('Cache-Control', 'no-store, private');
        }

        return $respuesta;
    }

    /** Solo permite el servidor local de Vite mientras se trabaja en desarrollo. */
    private function origenVite(): string
    {
        if (! app()->environment('local') || ! is_file(public_path('hot'))) {
            return '';
        }

        $partes = parse_url(trim(file_get_contents(public_path('hot'))));

        if (! is_array($partes)
            || ! in_array($partes['scheme'] ?? '', ['http', 'https'], true)
            || ! in_array($partes['host'] ?? '', ['localhost', '127.0.0.1', '[::1]', '::1'], true)) {
            return '';
        }

        return $partes['scheme'].'://'.$partes['host']
            .(isset($partes['port']) ? ':'.$partes['port'] : '');
    }
}
