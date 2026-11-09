<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchEducativo;
use App\Models\Mensaje;
use App\Models\User;
use App\Notifications\ActividadMatch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MensajeController extends Controller
{
    private const MensajesPorPagina = 40;

    public function index(Request $request, int $match): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $conexion = $this->buscarMatchAceptado($match, $usuarioId);
        $filtros = $request->validate([
            'antes' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $consulta = Mensaje::query()->where('match_id', $conexion->id);
        if (isset($filtros['antes'])) {
            $consulta->where('id', '<', $filtros['antes']);
        }

        // Se consulta uno adicional para saber si todavía hay historial.
        $mensajes = $consulta->orderByDesc('id')->limit(self::MensajesPorPagina + 1)->get();
        $otro = $this->otroEstudiante($conexion, $usuarioId);

        return response()->json([
            'data' => $mensajes->take(self::MensajesPorPagina)->reverse()->values()
                ->map(fn (Mensaje $mensaje): array => $this->serializar($mensaje, $usuarioId)),
            'hay_anteriores' => $mensajes->count() > self::MensajesPorPagina,
            'estudiante' => ['id' => $otro->id, 'nombre' => $otro->name],
        ]);
    }

    public function store(Request $request, int $match): JsonResponse
    {
        $usuario = $request->user();
        $usuarioId = (int) $usuario->id;

        $mensaje = DB::transaction(function () use ($request, $match, $usuario, $usuarioId): Mensaje {
            $conexion = $this->buscarMatchAceptado($match, $usuarioId, bloquear: true);
            $datos = $request->validate([
                'contenido' => ['required', 'string', 'max:2000'],
            ]);

            $mensaje = Mensaje::query()->create([
                'match_id' => $conexion->id,
                'remitente_id' => $usuarioId,
                'contenido' => trim($datos['contenido']),
            ]);

            $this->otroEstudiante($conexion, $usuarioId)
                ->notify(new ActividadMatch('mensaje_recibido', $usuario->name, $conexion->id));

            return $mensaje;
        });

        return response()->json(['data' => $this->serializar($mensaje, $usuarioId)], 201);
    }

    private function buscarMatchAceptado(int $matchId, int $usuarioId, bool $bloquear = false): MatchEducativo
    {
        $consulta = MatchEducativo::query()->whereKey($matchId)
            ->where(function (Builder $consulta) use ($usuarioId): void {
                $consulta->where('solicitante_id', $usuarioId)->orWhere('destinatario_id', $usuarioId);
            });

        if ($bloquear) {
            $consulta->lockForUpdate();
        }

        $conexion = $consulta->firstOrFail();
        abort_unless($conexion->estado === 'aceptado', 403, 'El match debe estar aceptado para enviar o leer mensajes.');

        return $conexion;
    }

    private function otroEstudiante(MatchEducativo $conexion, int $usuarioId): User
    {
        $otroId = (int) $conexion->solicitante_id === $usuarioId
            ? $conexion->destinatario_id
            : $conexion->solicitante_id;

        return User::query()->findOrFail($otroId, ['id', 'name']);
    }

    /** @return array{id: int, contenido: string, es_mio: bool, creado_en: string} */
    private function serializar(Mensaje $mensaje, int $usuarioId): array
    {
        return [
            'id' => $mensaje->id,
            'contenido' => $mensaje->contenido,
            'es_mio' => (int) $mensaje->remitente_id === $usuarioId,
            'creado_en' => $mensaje->created_at->toISOString(),
        ];
    }
}
