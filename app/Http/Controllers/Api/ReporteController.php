<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\AvisoCorreo;
use App\Notifications\ReporteAdministrativo;
use App\Notifications\TiempoReal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReporteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reportes = DB::table('reportes')->where('user_id', $request->user()->id)
            ->latest('id')->paginate(10, ['id', 'categoria', 'asunto', 'estado', 'created_at']);

        return response()->json($reportes);
    }

    public function store(Request $request, TiempoReal $tiempoReal): JsonResponse
    {
        $datos = $request->validate([
            'categoria' => ['required', 'in:error,convivencia,otro'],
            'asunto' => ['required', 'string', 'max:120'],
            'descripcion' => ['required', 'string', 'min:10', 'max:2000'],
        ], [
            'categoria.required' => 'Selecciona un tipo de reporte.',
            'categoria.in' => 'Selecciona uno de los tipos de reporte disponibles.',
            'asunto.required' => 'Escribe un asunto breve.',
            'descripcion.required' => 'Describe lo que pasó.',
            'descripcion.min' => 'Describe lo que pasó en al menos 10 caracteres.',
        ]);

        $fecha = now();
        $id = DB::transaction(function () use ($datos, $request, $fecha, $tiempoReal): int {
            $reporte = DB::table('reportes')->insertGetId($datos + [
                'user_id' => $request->user()->id,
                'created_at' => $fecha,
                'updated_at' => $fecha,
            ]);

            DB::afterCommit(fn () => $this->avisarAdministradores($reporte, $tiempoReal));

            return $reporte;
        }, attempts: 3);

        return response()->json(['id' => $id, 'message' => 'Tu reporte se registró correctamente.'], 201);
    }

    private function avisarAdministradores(int $reporte, TiempoReal $tiempoReal): void
    {
        try {
            foreach (User::query()->where('rol', 'admin')->lazyById(50) as $administrador) {
                try {
                    $administrador->notify(new ReporteAdministrativo($reporte));
                    $tiempoReal->publicar((int) $administrador->id, 'actividad', ['reporte_id' => $reporte]);
                    AvisoCorreo::enviar($administrador, 'reporte_nuevo', $reporte);
                } catch (Throwable $error) {
                    Log::warning('No se pudo enviar la notificación del reporte.', [
                        'reporte_id' => $reporte,
                        'tipo' => $error::class,
                    ]);
                }
            }
        } catch (Throwable $error) {
            Log::warning('No se pudo consultar a los administradores para notificar el reporte.', [
                'reporte_id' => $reporte,
                'tipo' => $error::class,
            ]);
        }
    }
}
