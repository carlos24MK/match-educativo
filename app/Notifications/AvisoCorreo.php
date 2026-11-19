<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class AvisoCorreo extends Notification
{
    public function __construct(public readonly string $tipo, public readonly ?int $reporteId = null) {}

    public static function enviar(User $usuario, string $tipo, ?int $reporteId = null): void
    {
        try {
            $usuario->notify(new self($tipo, $reporteId));
        } catch (Throwable $error) {
            Log::error('No se pudo enviar el aviso por correo.', [
                'tipo' => $tipo,
                'error' => $error::class,
                'codigo' => $error->getCode(),
            ]);
        }
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $correo = (new MailMessage)->greeting('Hola');

        return match ($this->tipo) {
            'solicitud_recibida' => $correo
                ->subject('Nueva solicitud de match en Match Educativo')
                ->line('Un estudiante te envió una solicitud. Entra a Mis matches para revisarla.')
                ->action('Ver solicitudes', route('matches', ['tipo' => 'recibidas'])),
            'solicitud_aceptada' => $correo
                ->subject('Aceptaron tu solicitud en Match Educativo')
                ->line('Tu solicitud fue aceptada. Ya puedes consultar la conexión y conversar con esa persona.')
                ->action('Ver mis matches', route('matches', ['tipo' => 'conexiones'])),
            'solicitud_rechazada' => $correo
                ->subject('Respondieron tu solicitud en Match Educativo')
                ->line('Tu solicitud fue rechazada. Puedes consultar su estado en el historial de coincidencias.')
                ->action('Ver historial', route('matches', ['tipo' => 'historial'])),
            'reporte_nuevo' => $correo
                ->subject('Nuevo reporte en Match Educativo')
                ->line('Hay un reporte nuevo para revisar. Inicia sesión en el panel de administración para consultar los detalles.')
                ->action('Revisar reporte', route('administracion', ['reporte' => $this->reporteId])),
            'codigos_generados' => $correo
                ->subject('Se generaron códigos de recuperación')
                ->line('Se generó un nuevo grupo de códigos de recuperación para tu cuenta. Los códigos anteriores dejaron de funcionar.')
                ->line('Si no hiciste este cambio, revisa la seguridad de tu cuenta.')
                ->action('Revisar seguridad', route('seguridad')),
            'contrasena_recuperada' => $correo
                ->subject('Se recuperó tu contraseña de Match Educativo')
                ->line('La contraseña de tu cuenta se actualizó mediante un código de recuperación.')
                ->line('Si no hiciste este cambio, contacta al equipo de Match Educativo.'),
            'contrasena_cambiada' => $correo
                ->subject('Se cambió tu contraseña de Match Educativo')
                ->line('La contraseña de tu cuenta se actualizó desde el panel de seguridad.')
                ->line('Si no hiciste este cambio, contacta al equipo de Match Educativo.'),
        };
    }
}
