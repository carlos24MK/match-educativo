<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ActividadMatch;
use App\Notifications\ReporteAdministrativo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => ['sometimes', 'required', 'integer', 'min:1', 'max:100000']]);
        $usuario = $request->user();
        $pagina = $this->notificaciones($usuario)->orderByDesc('id')->paginate(12);

        return response()->json([
            'data' => $pagina->getCollection()->map(fn (DatabaseNotification $notificacion): array => [
                'id' => $notificacion->id,
                'tipo' => $notificacion->data['tipo'],
                'titulo' => $notificacion->data['titulo'],
                'descripcion' => $notificacion->data['descripcion'],
                'match_id' => $notificacion->data['match_id'] ?? null,
                'reporte_id' => $notificacion->data['reporte_id'] ?? null,
                'leida' => $notificacion->read_at !== null,
                'creada_en' => $notificacion->created_at->toISOString(),
            ]),
            'no_leidas' => $this->contarNoLeidas($usuario),
            'es_admin' => $usuario->esAdministrador(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    public function leer(Request $request, string $notificacion): JsonResponse
    {
        $usuario = $request->user();
        $this->notificaciones($usuario)->findOrFail($notificacion)->markAsRead();

        return response()->json(['no_leidas' => $this->contarNoLeidas($usuario)]);
    }

    public function leerTodas(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $this->notificaciones($usuario)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['no_leidas' => $this->contarNoLeidas($usuario)]);
    }

    /** @return MorphMany<DatabaseNotification, User> */
    private function notificaciones(User $usuario): MorphMany
    {
        $tipos = [ActividadMatch::class];
        if ($usuario->esAdministrador()) {
            $tipos[] = ReporteAdministrativo::class;
        }

        return $usuario->notifications()->whereIn('type', $tipos);
    }

    private function contarNoLeidas(User $usuario): int
    {
        return $this->notificaciones($usuario)->whereNull('read_at')->count();
    }
}
