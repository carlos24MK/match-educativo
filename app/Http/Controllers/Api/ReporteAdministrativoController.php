<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use stdClass;

class ReporteAdministrativoController extends Controller
{
    private const Transiciones = [
        'pendiente' => ['en_revision', 'resuelto'],
        'en_revision' => ['resuelto'],
        'resuelto' => ['pendiente'],
    ];

    public function index(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'estado' => ['sometimes', Rule::in(array_keys(self::Transiciones))],
            'reporte' => ['sometimes', 'required', 'integer', 'min:1'],
            'page' => ['sometimes', 'required', 'integer', 'between:1,100000'],
        ]);

        $consulta = $this->reportes();
        if (isset($filtros['estado'])) {
            $consulta->where('reportes.estado', $filtros['estado']);
        }
        if (isset($filtros['reporte'])) {
            $consulta->where('reportes.id', $filtros['reporte']);
        }

        $pagina = $consulta->latest('reportes.id')->paginate(12);
        $conteos = DB::table('reportes')->selectRaw('estado, COUNT(*) AS total')->groupBy('estado')->pluck('total', 'estado');

        return response()->json([
            'data' => $pagina->getCollection()->map($this->presentar(...)),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
            'resumen' => [
                'pendiente' => (int) ($conteos['pendiente'] ?? 0),
                'en_revision' => (int) ($conteos['en_revision'] ?? 0),
                'resuelto' => (int) ($conteos['resuelto'] ?? 0),
                'usuarios' => DB::table('users')->count(),
            ],
        ]);
    }

    public function actualizar(Request $request, int $reporte): JsonResponse
    {
        $datos = $request->validate(['estado' => ['required', Rule::in(array_keys(self::Transiciones))]]);
        $estado = $datos['estado'];

        $actualizado = DB::transaction(function () use ($request, $reporte, $estado): stdClass {
            $fila = DB::table('reportes')->where('id', $reporte)->lockForUpdate()->firstOrFail();
            if ($fila->estado !== $estado) {
                abort_unless(in_array($estado, self::Transiciones[$fila->estado] ?? [], true),
                    409, 'El reporte cambió de estado. Actualiza la lista para continuar.');

                DB::table('reportes')->where('id', $reporte)->update([
                    'estado' => $estado,
                    'administrador_id' => $request->user()->id,
                    'updated_at' => now(),
                ]);
            }

            return $this->reportes()->where('reportes.id', $reporte)->firstOrFail();
        }, attempts: 3);

        return response()->json(['data' => $this->presentar($actualizado)]);
    }

    private function reportes(): Builder
    {
        return DB::table('reportes')
            ->leftJoin('users AS autor', 'reportes.user_id', '=', 'autor.id')
            ->leftJoin('users AS revisor', 'reportes.administrador_id', '=', 'revisor.id')
            ->select([
                'reportes.id', 'reportes.categoria', 'reportes.asunto', 'reportes.descripcion',
                'reportes.estado', 'reportes.created_at', 'reportes.updated_at',
                'autor.id AS autor_id', 'autor.name AS autor_nombre',
                'revisor.id AS revisor_id', 'revisor.name AS revisor_nombre',
            ]);
    }

    /** @return array<string, int|string|array{id: int, nombre: string}|null> */
    private function presentar(stdClass $reporte): array
    {
        return [
            'id' => (int) $reporte->id,
            'categoria' => $reporte->categoria,
            'asunto' => $reporte->asunto,
            'descripcion' => $reporte->descripcion,
            'estado' => $reporte->estado,
            'creado_en' => $reporte->created_at ? Date::parse($reporte->created_at)->toISOString() : null,
            'actualizado_en' => $reporte->updated_at ? Date::parse($reporte->updated_at)->toISOString() : null,
            'reportado_por' => $reporte->autor_id === null ? null : [
                'id' => (int) $reporte->autor_id,
                'nombre' => $reporte->autor_nombre,
            ],
            'revisado_por' => $reporte->revisor_id === null ? null : [
                'id' => (int) $reporte->revisor_id,
                'nombre' => $reporte->revisor_nombre,
            ],
        ];
    }
}
