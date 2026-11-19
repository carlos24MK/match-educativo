<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CodigoRecuperacionCorreo extends Notification
{
    public const Minutos = 15;

    public function __construct(public readonly string $codigo) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Código temporal de recuperación de Match Educativo')
            ->greeting('Hola')
            ->line('Tu código temporal es: '.$this->codigo)
            ->line('Escríbelo en la página de recuperación. Vence en '.self::Minutos.' minutos y funciona una sola vez.')
            ->line('Si no lo pediste, puedes ignorar este mensaje. No compartas el código.')
            ->action('Recuperar contraseña', route('recuperar-contrasena'));
    }
}
