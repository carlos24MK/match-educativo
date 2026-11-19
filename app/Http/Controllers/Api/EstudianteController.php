<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchEducativo;
use App\Models\Perfil;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
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
            'horario_comun' => ['sometimes', 'boolean'],
            'habilidades_complementarias' => ['sometimes', 'boolean'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
        ]);

        $usuarioId = (int) $request->user()->id;
        $consulta = Perfil::query()
            ->join('users', 'users.id', '=', 'perfiles.user_id')
            ->where('perfiles.visible_en_busqueda', true)
            ->where('perfiles.user_id', '!=', $usuarioId)
            ->select([
                'perfiles.user_id as id',
                'perfiles.user_id',
                'users.name as nombre',
                'perfiles.presentacion',
                'perfiles.ensena',
                'perfiles.aprende',
                'perfiles.programa',
                'perfiles.semestre',
                'perfiles.preferencias_estudio',
                'perfiles.foto_path',
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

        if ($request->boolean('horario_comun')) {
            $consulta->whereExists(function (QueryBuilder $horarios) use ($usuarioId): void {
                $horarios->selectRaw('1')
                    ->from('horarios_disponibles as candidato')
                    ->join('horarios_disponibles as propio', 'propio.dia', '=', 'candidato.dia')
                    ->whereColumn('candidato.user_id', 'perfiles.user_id')
                    ->where('propio.user_id', $usuarioId)
                    ->whereColumn('candidato.inicio', '<', 'propio.fin')
                    ->whereColumn('propio.inicio', '<', 'candidato.fin');
            });
        }

        if ($request->boolean('habilidades_complementarias')) {
            $this->filtrarComplementarias($consulta, Perfil::where('user_id', $usuarioId)->first());
        }

        $pagina = $consulta->paginate(9);
        $parejas = $pagina->getCollection()->map(
            fn (Perfil $perfil): string => MatchEducativo::clavePareja($usuarioId, (int) $perfil->id),
        );
        $matches = MatchEducativo::whereIn('pareja', $parejas)->get()->keyBy('pareja');

        $resultados = $pagina->getCollection()->map(function (Perfil $perfil) use ($matches, $usuarioId): array {
            $match = $matches->get(MatchEducativo::clavePareja($usuarioId, (int) $perfil->id));

            return $perfil->only(['id', 'nombre', 'presentacion', 'ensena', 'aprende', 'programa', 'semestre', 'preferencias_estudio']) + [
                'foto_url' => $perfil->fotoUrl(),
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
    private function filtrarComplementarias(Builder $consulta, ?Perfil $perfil): void
    {
        $temas = [
            'perfiles.ensena' => $perfil?->aprende ?? [],
            'perfiles.aprende' => $perfil?->ensena ?? [],
        ];

        if ($temas['perfiles.ensena'] === [] && $temas['perfiles.aprende'] === []) {
            $consulta->whereRaw('1 = 0');

            return;
        }

        $conexion = $consulta->getQuery()->getConnection();
        $esSqlite = $conexion->getDriverName() === 'sqlite';
        if ($esSqlite) {
            $conexion->getReadPdo()->sqliteCreateFunction(
                'normalizar_habilidad',
                static fn (string $valor): string => mb_strtolower(trim($valor), 'UTF-8'),
                1,
            );
        }
        $valorNormalizado = $esSqlite ? 'normalizar_habilidad(habilidades.value)' : 'LOWER(TRIM(habilidades.value)) COLLATE utf8mb4_bin';

        $consulta->where(function (Builder $coincidencias) use ($temas, $esSqlite, $valorNormalizado): void {
            foreach ($temas as $columna => $habilidades) {
                if ($habilidades === []) {
                    continue;
                }
                $valores = array_map(static fn (string $tema): string => mb_strtolower(trim($tema), 'UTF-8'), $habilidades);
                $marcas = implode(', ', array_fill(0, count($valores), '?'));
                $tabla = $this->tablaDeHabilidades($columna, $esSqlite);
                $coincidencias->orWhereRaw(
                    "EXISTS (SELECT 1 FROM {$tabla} AS habilidades WHERE {$valorNormalizado} IN ({$marcas}))",
                    $valores,
                );
            }
        });
    }

    private function tablaDeHabilidades(string $columna, bool $esSqlite): string
    {
        return $esSqlite
            ? "json_each({$columna})"
            : "JSON_TABLE({$columna}, '$[*]' COLUMNS(value VARCHAR(60) CHARACTER SET utf8mb4 PATH '$'))";
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
                $habilidades = $this->tablaDeHabilidades($columna, $esSqlite);
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
