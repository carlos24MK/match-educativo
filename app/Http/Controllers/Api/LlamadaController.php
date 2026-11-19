<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchEducativo;
use App\Notifications\TiempoReal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as Consulta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use stdClass;

class LlamadaController extends Controller
{
    private const EstadosActivos = ['pendiente', 'aceptada'];

    private const SenalesPorPagina = 100;

    private const MaximoSenales = 128;

    public function index(Request $request): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $llamada = $this->consultarLlamadas($usuarioId)
            ->whereIn('estado', self::EstadosActivos)
            ->where('vence_en', '>', now())
            ->latest('id')->first();

        return response()->json($this->respuesta($llamada, $usuarioId, 0));
    }

    public function mostrar(Request $request, int $llamada): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $datos = $request->validate(['despues' => ['sometimes', 'integer', 'min:0']]);
        $registro = $this->consultarLlamadas($usuarioId)->where('id', $llamada)->firstOrFail();

        return response()->json($this->respuesta($registro, $usuarioId, (int) ($datos['despues'] ?? 0)));
    }

    public function store(Request $request, int $match, TiempoReal $tiempoReal): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $datos = $request->validate(['tipo' => ['required', Rule::in(['audio', 'video'])]]);

        $llamada = DB::transaction(function () use ($match, $usuarioId, $datos): stdClass {
            $conexion = MatchEducativo::query()->whereKey($match)
                ->where(function (Builder $consulta) use ($usuarioId): void {
                    $consulta->where('solicitante_id', $usuarioId)->orWhere('destinatario_id', $usuarioId);
                })->firstOrFail();
            abort_unless($conexion->estado === 'aceptado', 403, 'El match debe estar aceptado para iniciar una llamada.');

            $otroId = (int) $conexion->solicitante_id === $usuarioId
                ? (int) $conexion->destinatario_id
                : (int) $conexion->solicitante_id;

            // El bloqueo en InnoDB evita que dos matches reserven al mismo usuario simultáneamente.
            $participantes = [min($usuarioId, $otroId), max($usuarioId, $otroId)];
            foreach ($participantes as $participante) {
                DB::table('llamada_bloqueos')->upsert(['user_id' => $participante], ['user_id'], ['user_id']);
            }

            $activas = DB::table('llamadas')->whereIn('estado', self::EstadosActivos)
                ->where('vence_en', '>', now())
                ->where(function (Consulta $consulta) use ($participantes): void {
                    $consulta->whereIn('iniciador_id', $participantes)->orWhereIn('destinatario_id', $participantes);
                })->lockForUpdate()->first(['id']);
            abort_if($activas !== null, 409, 'Hay una llamada en curso. Intenta de nuevo en unos momentos.');

            $antiguas = DB::table('llamadas')->where('vence_en', '<=', now()->subDay())
                ->oldest('vence_en')->limit(50)->pluck('id');
            DB::table('llamadas')->whereIn('id', $antiguas)->delete();

            $nuevo = [
                'match_id' => $match,
                'iniciador_id' => $usuarioId,
                'destinatario_id' => $otroId,
                'tipo' => $datos['tipo'],
                'estado' => 'pendiente',
                'vence_en' => now()->addSeconds(45)->toDateTimeString(),
            ];
            $nuevo['id'] = DB::table('llamadas')->insertGetId($nuevo);

            return (object) $nuevo;
        }, attempts: 3);

        $this->avisar($tiempoReal, $llamada, $usuarioId);

        return response()->json($this->respuesta($llamada, $usuarioId, 0), 201);
    }

    public function responder(Request $request, int $llamada, TiempoReal $tiempoReal): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $datos = $request->validate(['accion' => ['required', Rule::in(['aceptar', 'rechazar', 'terminar'])]]);

        $registro = DB::transaction(function () use ($llamada, $usuarioId, $datos): stdClass {
            $registro = $this->consultarLlamadas($usuarioId)->where('id', $llamada)->lockForUpdate()->firstOrFail();
            $estado = $this->estado($registro);
            $accion = $datos['accion'];

            if ($accion === 'terminar') {
                if (! in_array($estado, self::EstadosActivos, true)) {
                    return $registro;
                }
                abort_if($estado === 'pendiente' && (int) $registro->iniciador_id !== $usuarioId, 403);
            } else {
                abort_unless((int) $registro->destinatario_id === $usuarioId, 403);
                abort_unless($estado === 'pendiente', 409, 'La llamada ya no está pendiente.');
            }

            $registro->estado = match ($accion) {
                'aceptar' => 'aceptada',
                'rechazar' => 'rechazada',
                'terminar' => 'terminada',
            };
            $registro->vence_en = ($accion === 'aceptar' ? now()->addHours(2) : now())->toDateTimeString();

            DB::table('llamadas')->where('id', $llamada)
                ->update(['estado' => $registro->estado, 'vence_en' => $registro->vence_en]);

            if ($accion !== 'aceptar') {
                DB::table('llamada_senales')->where('llamada_id', $llamada)->delete();
            }

            return $registro;
        }, attempts: 3);

        $this->avisar($tiempoReal, $registro, $usuarioId);

        return response()->json($this->respuesta($registro, $usuarioId, 0));
    }

    public function senal(Request $request, int $llamada, TiempoReal $tiempoReal): JsonResponse
    {
        $usuarioId = (int) $request->user()->id;
        $datos = $this->validarSenal($request);

        [$registro, $senalId] = DB::transaction(function () use ($llamada, $usuarioId, $datos): array {
            $registro = $this->consultarLlamadas($usuarioId)->where('id', $llamada)->lockForUpdate()->firstOrFail();
            abort_unless($this->estado($registro) === 'aceptada', 409, 'La llamada no está activa.');

            $tipo = $datos['tipo'];
            $esIniciador = (int) $registro->iniciador_id === $usuarioId;
            $senales = DB::table('llamada_senales')->where('llamada_id', $llamada);

            if ($tipo === 'offer') {
                abort_unless($esIniciador, 403);
            }
            if ($tipo === 'answer') {
                abort_if($esIniciador, 403);
                abort_unless((clone $senales)->where('tipo', 'offer')->exists(), 409);
            }

            $contenido = json_encode($datos['datos'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            abort_if(strlen($contenido) > 60_000, 422, 'La señal supera el tamaño permitido.');
            if ($tipo !== 'ice') {
                $existente = (clone $senales)->where('tipo', $tipo)->first(['id', 'datos']);
                if ($existente !== null) {
                    abort_unless($existente->datos === $contenido, 409);

                    return [$registro, $existente->id];
                }
            }

            $cantidad = $senales->where('remitente_id', $usuarioId)->count();
            abort_if($cantidad >= self::MaximoSenales, 429);

            $senalId = DB::table('llamada_senales')->insertGetId([
                'llamada_id' => $llamada,
                'remitente_id' => $usuarioId,
                'tipo' => $tipo,
                'datos' => $contenido,
            ]);

            return [$registro, $senalId];
        }, attempts: 3);

        if ($datos['tipo'] !== 'ice') {
            $this->avisar($tiempoReal, $registro, $usuarioId);
        }

        return response()->json(['id' => (int) $senalId], 201);
    }

    /** @return array{tipo: string, datos: array<string, string|int|null>} */
    private function validarSenal(Request $request): array
    {
        $tipo = $request->validate(['tipo' => ['required', Rule::in(['offer', 'answer', 'ice'])]])['tipo'];
        $reglas = $tipo === 'ice'
            ? [
                'datos' => ['required', 'array:candidate,sdpMid,sdpMLineIndex,usernameFragment'],
                'datos.candidate' => ['required', 'string', 'max:2048'],
                'datos.sdpMid' => ['required_without:datos.sdpMLineIndex', 'nullable', 'string', 'max:64'],
                'datos.sdpMLineIndex' => ['required_without:datos.sdpMid', 'nullable', 'integer', 'between:0,65535'],
                'datos.usernameFragment' => ['nullable', 'string', 'max:256'],
            ]
            : [
                'datos' => ['required', 'array:sdp'],
                'datos.sdp' => ['required', 'string', 'starts_with:v=0', 'max:12000'],
            ];
        $datos = $request->validate($reglas);

        return ['tipo' => $tipo, 'datos' => $datos['datos']];
    }

    private function consultarLlamadas(int $usuarioId): Consulta
    {
        return DB::table('llamadas')->where(function (Consulta $consulta) use ($usuarioId): void {
            $consulta->where('iniciador_id', $usuarioId)->orWhere('destinatario_id', $usuarioId);
        })->whereExists(function (Consulta $consulta): void {
            $consulta->select('id')->from('matches')->whereColumn('matches.id', 'llamadas.match_id')->where('estado', 'aceptado');
        });
    }

    private function estado(stdClass $llamada): string
    {
        if (in_array($llamada->estado, self::EstadosActivos, true) && Date::parse($llamada->vence_en)->lte(now())) {
            return 'expirada';
        }

        return $llamada->estado;
    }

    private function otroUsuarioId(stdClass $llamada, int $usuarioId): int
    {
        return (int) $llamada->iniciador_id === $usuarioId
            ? (int) $llamada->destinatario_id
            : (int) $llamada->iniciador_id;
    }

    private function avisar(TiempoReal $tiempoReal, stdClass $llamada, int $usuarioId): void
    {
        $tiempoReal->publicar($this->otroUsuarioId($llamada, $usuarioId), 'llamada', [
            'llamada_id' => (int) $llamada->id,
            'match_id' => (int) $llamada->match_id,
        ]);
    }

    /** @return array<string, mixed> */
    private function respuesta(?stdClass $llamada, int $usuarioId, int $cursor): array
    {
        $respuesta = ['data' => null, 'senales' => [], 'hay_mas_senales' => false, 'ice_servers' => []];
        if ($llamada === null) {
            return $respuesta;
        }

        $estado = $this->estado($llamada);
        $otro = DB::table('users')->where('id', $this->otroUsuarioId($llamada, $usuarioId))->firstOrFail(['id', 'name']);
        $respuesta['data'] = [
            'id' => (int) $llamada->id,
            'match_id' => (int) $llamada->match_id,
            'tipo' => $llamada->tipo,
            'estado' => $estado,
            'es_iniciador' => (int) $llamada->iniciador_id === $usuarioId,
            'estudiante' => ['id' => (int) $otro->id, 'nombre' => $otro->name],
        ];

        if ($estado === 'aceptada') {
            $senales = DB::table('llamada_senales')->where('llamada_id', $llamada->id)
                ->where('remitente_id', $otro->id)->where('id', '>', $cursor)
                ->oldest('id')->limit(self::SenalesPorPagina + 1)->get();

            $respuesta['senales'] = $senales->take(self::SenalesPorPagina)->map(fn (stdClass $senal): array => [
                'id' => (int) $senal->id,
                'tipo' => $senal->tipo,
                'datos' => json_decode($senal->datos, true, flags: JSON_THROW_ON_ERROR),
            ])->all();
            $respuesta['hay_mas_senales'] = $senales->count() > self::SenalesPorPagina;
            $respuesta['ice_servers'] = $this->servidoresIce($llamada, $usuarioId);
        }

        return $respuesta;
    }

    /** @return list<array{urls: list<string>, username: string, credential: string}> */
    private function servidoresIce(stdClass $llamada, int $usuarioId): array
    {
        $secret = config('services.turn.secret');
        $urls = array_values(array_filter(
            array_map('trim', explode(',', (string) config('services.turn.urls'))),
            fn (string $url): bool => str_starts_with($url, 'turn:') || str_starts_with($url, 'turns:'),
        ));

        if (! is_string($secret) || $secret === '' || $urls === []) {
            return [];
        }

        $username = Date::parse($llamada->vence_en)->timestamp.':'.$usuarioId;

        return [[
            'urls' => $urls,
            'username' => $username,
            'credential' => base64_encode(hash_hmac('sha1', $username, $secret, true)),
        ]];
    }
}
