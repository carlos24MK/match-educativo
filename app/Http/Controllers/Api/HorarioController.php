<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HorarioController extends Controller
{
    public function mostrar(Request $request): JsonResponse
    {
        $horarios = DB::table('horarios_disponibles')->where('user_id', $request->user()->id)
            ->orderBy('dia')->orderBy('inicio')->get(['dia', 'inicio', 'fin']);

        return response()->json(['data' => $horarios]);
    }

    public function guardar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'horarios' => ['present', 'array', 'list', 'max:14'],
            'horarios.*' => ['array:dia,inicio,fin'],
            'horarios.*.dia' => ['required', 'integer', 'between:1,7'],
            'horarios.*.inicio' => ['required', 'date_format:H:i'],
            'horarios.*.fin' => ['required', 'date_format:H:i', 'after:horarios.*.inicio'],
        ], [
            'horarios.max' => 'Puedes guardar hasta 14 bloques de horario.',
            'horarios.*.dia.required' => 'Selecciona el día de cada bloque.',
            'horarios.*.inicio.required' => 'Indica la hora de inicio de cada bloque.',
            'horarios.*.fin.required' => 'Indica la hora de fin de cada bloque.',
            'horarios.*.fin.after' => 'La hora de fin debe ser posterior a la de inicio.',
        ]);

        $usuarioId = (int) $request->user()->id;
        $horarios = collect($datos['horarios'])->sortBy(['dia', 'inicio'])->values();
        $anterior = null;

        foreach ($horarios as $horario) {
            if ($anterior && (int) $anterior['dia'] === (int) $horario['dia'] && $anterior['fin'] > $horario['inicio']) {
                throw ValidationException::withMessages(['horarios' => 'Hay dos bloques que se cruzan el mismo día. Ajusta las horas.']);
            }
            $anterior = $horario;
        }

        DB::transaction(function () use ($usuarioId, $horarios): void {
            User::query()->whereKey($usuarioId)->lockForUpdate()->firstOrFail();
            DB::table('horarios_disponibles')->where('user_id', $usuarioId)->delete();
            if ($horarios->isNotEmpty()) {
                DB::table('horarios_disponibles')->insert(
                    $horarios->map(fn (array $horario): array => ['user_id' => $usuarioId] + $horario)->all(),
                );
            }
        }, 3);

        return $this->mostrar($request);
    }
}
