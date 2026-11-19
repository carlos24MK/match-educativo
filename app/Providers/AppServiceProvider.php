<?php

namespace App\Providers;

use App\Models\User;
use App\Notifications\ActividadMatch;
use App\Notifications\AvisoCorreo;
use App\Notifications\TiempoReal;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        Event::listen(NotificationSent::class, function (NotificationSent $evento): void {
            if ($evento->channel !== 'database' || ! $evento->notification instanceof ActividadMatch) {
                return;
            }

            $usuarioId = $evento->notifiable->getKey();
            $matchId = $evento->notification->matchId;
            $tipo = $evento->notification->tipo;
            DB::afterCommit(function () use ($usuarioId, $matchId, $tipo): void {
                app(TiempoReal::class)->publicar($usuarioId, 'actividad', ['match_id' => $matchId]);

                if (in_array($tipo, ['solicitud_recibida', 'solicitud_aceptada', 'solicitud_rechazada'], true)) {
                    $usuario = User::find($usuarioId);

                    if ($usuario !== null) {
                        AvisoCorreo::enviar($usuario, $tipo);
                    }
                }
            });
        });
    }
}
