<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ReporteAdministrativo extends Notification
{
    public function __construct(public readonly int $reporteId) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array{tipo: string, titulo: string, descripcion: string, reporte_id: int}
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'tipo' => 'reporte_nuevo',
            'titulo' => 'Nuevo reporte de la comunidad',
            'descripcion' => 'Revisa los detalles en el panel de administración.',
            'reporte_id' => $this->reporteId,
        ];
    }
}
