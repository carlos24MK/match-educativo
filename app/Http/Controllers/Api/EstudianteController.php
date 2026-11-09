<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchEducativo;
use App\Models\Perfil;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstudianteController extends Controller
{
    public function buscar(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'habilidad' => ['nullable', 'string', 'max:60'],
            'buscar' => ['nullable', 'string', 'max:60'],
            'tipo' => ['sometimes', 'in:ensena,aprende,todos'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
        ]);

        $usuarioId = (int) $request->user()->id;
        $consulta = Perfil::query()
            ->join('users', 'users.id', '=', 'perfiles.user_id')
            ->where('perfiles.visible_en_busqueda', true)
            ->where('perfiles.user_id', '!=', $usuarioId)
            ->select([
                'perfiles.user_id as id',
                'users.name as nombre',
                'perfiles.presentacion',
                'perfiles.ensena',
                'perfiles.aprende',
            ])
            ->orderBy('users.name')
            ->orderBy('perfiles.user_id');

        if (array_key_exists('buscar', $filtros)) {
            $this->filtrarDirectorio($consulta, $filtros['buscar'] ?? '', $filtros['tipo'] ?? 'todos');
        } elseif (isset($filtros['habilidad'])) {
            $consulta->where(function (Builder $coincidencias) use ($filtros): void {
                foreach ($this->columnasDeHabilidades($filtros['tipo'] ?? 'ensena') as $columna) {
                    $coincidencias->orWhereJsonContains($columna, $filtros['habilidad']);
                }
            });
        }

        $pagina = $consulta->paginate(9);
        $parejas = $pagina->getCollection()->map(
            fn (Perfil $perfil): string => MatchEducativo::clavePareja($usuarioId, (int) $perfil->id),
        );
        $matches = MatchEducativo::whereIn('pareja', $parejas)->get()->keyBy('pareja');

        $resultados = $pagina->getCollection()->map(function (Perfil $perfil) use ($matches, $usuarioId): array {
            $match = $matches->get(MatchEducativo::clavePareja($usuarioId, (int) $perfil->id));

            return $perfil->only(['id', 'nombre', 'presentacion', 'ensena', 'aprende']) + [
                'match' => $match ? [
                    'id' => $match->id,
                    'estado' => $match->estado,
                    'direccion' => (int) $match->solicitante_id === $usuarioId ? 'enviada' : 'recibida',
                ] : null,
            ];
        });

        return response()->json([
            'data' => $resultados,
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }

    /** @param Builder<Perfil> $consulta */
    private function filtrarDirectorio(Builder $consulta, string $termino, string $tipo): void
    {
        $columnas = $this->columnasDeHabilidades($tipo);

        if ($tipo !== 'todos') {
            $consulta->whereJsonLength($columnas[0], '>', 0);
        }

        if ($termino === '') {
            return;
        }

        $conexion = $consulta->getQuery()->getConnection();
        $esSqlite = $conexion->getDriverName() === 'sqlite';

        // El LOWER de SQLite solo convierte caracteres ASCII.
        if ($esSqlite) {
            $conexion->getReadPdo()->sqliteCreateFunction(
                'contiene_texto',
                static fn (string $valor, string $texto): int => (int) (mb_stripos($valor, $texto, 0, 'UTF-8') !== false),
                2,
            );
        }

        $contiene = $esSqlite
            ? 'contiene_texto(%s, ?) = 1'
            : 'INSTR(LOWER(%s) COLLATE utf8mb4_bin, LOWER(?)) > 0';

        $consulta->where(function (Builder $coincidencias) use ($columnas, $contiene, $esSqlite, $termino): void {
            $coincidencias->whereRaw(sprintf($contiene, 'users.name'), [$termino]);

            foreach ($columnas as $columna) {
                $habilidades = $esSqlite
                    ? "json_each({$columna})"
                    : "JSON_TABLE({$columna}, '$[*]' COLUMNS(value VARCHAR(60) CHARACTER SET utf8mb4 PATH '$'))";
                $habilidadCoincide = sprintf($contiene, 'habilidades.value');

                $coincidencias->orWhereRaw(
                    "EXISTS (SELECT 1 FROM {$habilidades} AS habilidades WHERE {$habilidadCoincide})",
                    [$termino],
                );
            }
        });
    }

    /** @return list<string> */
    private function columnasDeHabilidades(string $tipo): array
    {
        return match ($tipo) {
            'ensena' => ['perfiles.ensena'],
            'aprende' => ['perfiles.aprende'],
            default => ['perfiles.ensena', 'perfiles.aprende'],
        };
    }
}
