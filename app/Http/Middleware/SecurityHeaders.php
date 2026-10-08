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
        $conexion = $desarrollo
            ? $desarrollo.' '.preg_replace('/^http/', 'ws', $desarrollo)
            : '';

        $politica = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'nonce-".Vite::cspNonce()."' ".$desarrollo,
            "style-src 'self' 'unsafe-inline' ".$desarrollo,
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self' ".$conexion,
        ];

        $respuesta->headers->set('Content-Security-Policy', implode('; ', $politica));
        $respuesta->headers->set('X-Content-Type-Options', 'nosniff');
        $respuesta->headers->set('X-Frame-Options', 'DENY');
        $respuesta->headers->set('Referrer-Policy', 'same-origin');
        $respuesta->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        if ($request->isSecure()) {
            $respuesta->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        if ($request->is('api/*', 'login', 'registro', 'dashboard', 'configuracion/*', 'recuperar-contrasena')) {
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
