<?php

namespace App\Notifications;

use Illuminate\Support\Facades\Log;
use Pusher\Pusher;
use Throwable;

class TiempoReal
{
    public function disponible(): bool
    {
        $config = config('services.pusher');

        foreach (['key', 'secret', 'app_id', 'cluster'] as $campo) {
            if (! is_string($config[$campo] ?? null) || trim($config[$campo]) === '') {
                return false;
            }
        }

        return true;
    }

    public function cliente(): Pusher
    {
        $config = config('services.pusher');

        return new Pusher($config['key'], $config['secret'], $config['app_id'], [
            'cluster' => $config['cluster'],
            'useTLS' => true,
            'timeout' => 2,
        ]);
    }

    /** @param array<string, int|bool> $datos */
    public function publicar(int $usuarioId, string $evento, array $datos): void
    {
        if (! $this->disponible()) {
            return;
        }

        try {
            $this->cliente()->trigger('private-user.'.$usuarioId, $evento, $datos);
        } catch (Throwable $error) {
            Log::error('Falló la publicación en Pusher.', [
                'evento' => $evento,
                'tipo' => $error::class,
                'codigo' => $error->getCode(),
            ]);
        }
    }
}
