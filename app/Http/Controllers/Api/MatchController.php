<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchEducativo;
use App\Models\Perfil;
use App\Models\User;
use App\Notifications\ActividadMatch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'tipo' => ['sometimes', 'in:recibidas,enviadas,conexiones,historial'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
        ]);
        $usuarioId = (int) $request->user()->id;

        $consulta = $this->delUsuario($usuarioId)
            ->with(['solicitante:id,name', 'destinatario:id,name']);

        match ($filtros['tipo'] ?? 'recibidas') {
            'recibidas' => $consulta->where('destinatario_id', $usuarioId)->where('estado', 'pendiente'),
            'enviadas' => $consulta->where('solicitante_id', $usuarioId)->where('estado', 'pendiente'),
            'conexiones' => $consulta->where('estado', 'aceptado'),
            'historial' => $consulta->whereIn('estado', ['rechazado', 'cancelado']),
        };

        $pagina = $consulta->latest('updated_at')->orderByDesc('id')->paginate(12);

        return response()->json([
            'data' => $pagina->getCollection()
                ->map(fn (MatchEducativo $solicitud): array => $this->presentar($solicitud, $usuarioId))
                ->all(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate(['estudiante_id' => ['required', 'integer', 'min:1']]);
        $usuario = $request->user();
        $usuarioId = (int) $usuario->id;
        $destinatarioId = (int) $datos['estudiante_id'];

        if ($usuarioId === $destinatarioId) {
            throw ValidationException::withMessages(['estudiante_id' => 'No puedes enviarte una solicitud.']);
        }

        try {
            $solicitud = DB::transaction(function () use ($usuario, $usuarioId, $destinatarioId): MatchEducativo {
                $perfil = Perfil::query()->where('user_id', $destinatarioId)
                    ->where('visible_en_busqueda', true)->lockForUpdate()->first();
                abort_if($perfil === null, 404, 'Este estudiante no está disponible en la búsqueda.');

                $solicitud = MatchEducativo::create([
                    'solicitante_id' => $usuarioId,
                    'destinatario_id' => $destinatarioId,
                    'pareja' => MatchEducativo::clavePareja($usuarioId, $destinatarioId),
                ]);
                $solicitud->load('destinatario:id,name');
                $solicitud->destinatario->notify(
                    new ActividadMatch('solicitud_recibida', $usuario->name, $solicitud->id),
                );

                return $solicitud;
            }, 3);
        } catch (UniqueConstraintViolationException $error) {
            if (! MatchEducativo::query()->where('pareja', MatchEducativo::clavePareja($usuarioId, $destinatarioId))->exists()) {
                throw $error;
            }

            abort(409, 'Ya existe una solicitud entre estas cuentas.');
        }

        return response()->json(['data' => $this->presentar($solicitud, $usuarioId)], 201);
    }

    public function responder(Request $request, int $match): JsonResponse
    {
        $datos = $request->validate(['accion' => ['required', 'in:aceptar,rechazar,cancelar']]);
        $usuario = $request->user();
        $usuarioId = (int) $usuario->id;
        $accion = $datos['accion'];

        $solicitud = DB::transaction(function () use ($match, $usuario, $usuarioId, $accion): MatchEducativo {
            $solicitud = $this->delUsuario($usuarioId)->whereKey($match)->lockForUpdate()->firstOrFail();
            $soySolicitante = $solicitud->solicitante_id === $usuarioId;

            abort_unless($soySolicitante === ($accion === 'cancelar'), 403, 'No puedes realizar esta acción.');
            abort_unless($solicitud->estado === 'pendiente', 409, 'La solicitud ya fue respondida o cancelada.');

            $solicitud->estado = match ($accion) {
                'aceptar' => 'aceptado',
                'rechazar' => 'rechazado',
                'cancelar' => 'cancelado',
            };
            $solicitud->save();
            $solicitud->load(['solicitante:id,name', 'destinatario:id,name']);

            if ($accion !== 'cancelar') {
                $tipo = $accion === 'aceptar' ? 'solicitud_aceptada' : 'solicitud_rechazada';
                $solicitud->solicitante->notify(new ActividadMatch($tipo, $usuario->name, $solicitud->id));
            }

            return $solicitud;
        }, 3);

        return response()->json(['data' => $this->presentar($solicitud, $usuarioId)]);
    }

    /** @return Builder<MatchEducativo> */
    private function delUsuario(int $usuarioId): Builder
    {
        return MatchEducativo::query()->where(function (Builder $consulta) use ($usuarioId): void {
            $consulta->where('solicitante_id', $usuarioId)->orWhere('destinatario_id', $usuarioId);
        });
    }

    /** @return array{id:int, estado:string, direccion:string, estudiante:array{id:int, nombre:string}, actualizado_en:string} */
    private function presentar(MatchEducativo $solicitud, int $usuarioId): array
    {
        $enviada = $solicitud->solicitante_id === $usuarioId;
        /** @var User $estudiante */
        $estudiante = $enviada ? $solicitud->destinatario : $solicitud->solicitante;

        return [
            'id' => $solicitud->id,
            'estado' => $solicitud->estado,
            'direccion' => $enviada ? 'enviada' : 'recibida',
            'estudiante' => ['id' => $estudiante->id, 'nombre' => $estudiante->name],
            'actualizado_en' => $solicitud->updated_at->toISOString(),
        ];
    }
}
