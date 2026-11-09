<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ActividadMatch extends Notification
{
    public function __construct(
        public readonly string $tipo,
        public readonly string $nombre,
        public readonly int $matchId,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array{tipo: string, titulo: string, descripcion: string, match_id: int}
     */
    public function toDatabase(object $notifiable): array
    {
        [$titulo, $descripcion] = match ($this->tipo) {
            'solicitud_recibida' => ['Nueva solicitud de match', $this->nombre.' te envió una solicitud.'],
            'solicitud_aceptada' => ['Solicitud aceptada', $this->nombre.' aceptó tu solicitud. Ya pueden enviarse mensajes.'],
            'solicitud_rechazada' => ['Solicitud rechazada', $this->nombre.' rechazó tu solicitud.'],
            'mensaje_recibido' => ['Nuevo mensaje', $this->nombre.' te envió un mensaje.'],
            default => ['Actividad de match', 'Hay una novedad en uno de tus matches.'],
        };

        return [
            'tipo' => $this->tipo,
            'titulo' => $titulo,
            'descripcion' => $descripcion,
            'match_id' => $this->matchId,
        ];
    }
}
