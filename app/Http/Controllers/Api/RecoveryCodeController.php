<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecoveryCode;
use App\Models\User;
use App\Notifications\AvisoCorreo;
use App\Notifications\CodigoRecuperacionCorreo;
use App\Rules\CompatiblePassword;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class RecoveryCodeController extends Controller
{
    /** Muestra el número disponible sin revelar códigos ni hashes. */
    public function estado(Request $request): JsonResponse
    {
        $codigos = RecoveryCode::where('user_id', $request->user()->getAuthIdentifier())
            ->get(['used_at']);

        return response()->json([
            'data' => [
                'total' => $codigos->count(),
                'remaining' => $codigos->whereNull('used_at')->count(),
            ],
        ]);
    }

    /** Confirma al propietario y reemplaza su grupo completo de seis códigos. */
    public function generar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'password' => ['bail', 'required', 'string', 'max:255', new CompatiblePassword],
        ]);

        $usuarioId = $request->user()->getAuthIdentifier();

        $codigos = DB::transaction(function () use ($usuarioId, $datos): array {
            $usuario = User::whereKey($usuarioId)->lockForUpdate()->firstOrFail();

            if (! Hash::check($datos['password'], $usuario->password)) {
                throw ValidationException::withMessages([
                    'password' => ['La contraseña actual es incorrecta.'],
                ]);
            }

            RecoveryCode::where('user_id', $usuario->id)->delete();
            $codigos = [];

            for ($i = 0; $i < 6; $i++) {
                $codigo = implode('-', str_split(strtoupper(bin2hex(random_bytes(16))), 8));

                RecoveryCode::create([
                    'user_id' => $usuario->id,
                    'code_hash' => Hash::make($codigo),
                    'used_at' => null,
                ]);

                $codigos[] = $codigo;
            }

            DB::afterCommit(fn () => AvisoCorreo::enviar($usuario, 'codigos_generados'));

            return $codigos;
        });

        return response()->json([
            'success' => true,
            'message' => 'Se generaron seis códigos. Descárgalos y guárdalos en un lugar seguro.',
            'data' => ['recovery_codes' => $codigos],
        ])->header('Cache-Control', 'no-store');
    }

    /** Envía un código temporal sin revelar si la cuenta existe. */
    public function enviarCodigo(Request $request): JsonResponse
    {
        $datos = $request->validate(['email' => ['required', 'string', 'email', 'max:191']]);
        $transporte = config('mail.mailers.'.config('mail.default').'.transport');
        if ($transporte !== 'smtp' && ! ($transporte === 'array' && app()->environment('testing'))) {
            return response()->json([
                'message' => 'El envío por correo aún no está disponible. Puedes usar un código de respaldo.',
            ], 503);
        }

        $correo = $datos['email'];
        $clave = 'recovery-correo:'.hash('sha256', Str::lower($correo));
        $codigo = implode('-', str_split(strtoupper(bin2hex(random_bytes(6))), 4));
        $envio = Cache::lock($clave.':envio', 10)->get(function () use ($clave, $correo, $codigo): ?array {
            if (RateLimiter::tooManyAttempts($clave, 1)) {
                return null;
            }

            RateLimiter::hit($clave, 60);
            $usuario = User::where('email', $correo)->first();
            $hash = Hash::make($this->huellaCorreo($codigo, $usuario?->getAuthPassword() ?? ''));
            if (! $usuario) {
                return null;
            }

            $this->tokensCorreo()->upsert([
                'email' => $usuario->email,
                'token' => $hash,
                'created_at' => now(),
            ], ['email'], ['token', 'created_at']);

            return [$usuario, $hash];
        });

        if (is_array($envio)) {
            [$usuario, $hash] = $envio;
            defer(function () use ($usuario, $codigo, $hash): void {
                try {
                    $usuario->notify(new CodigoRecuperacionCorreo($codigo));
                } catch (Throwable $error) {
                    $this->tokensCorreo()->where('email', $usuario->email)->where('token', $hash)->delete();
                    Log::warning('No se pudo enviar el código temporal de recuperación.', ['tipo' => $error::class]);
                }
            });
        }

        return response()->json([
            'message' => 'Si el correo corresponde a una cuenta, recibirás un código temporal. Revisa también el correo no deseado.',
        ]);
    }

    /** Consume un código y cambia la contraseña sin iniciar sesión automáticamente. */
    public function recuperar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'recovery_code' => ['required', 'string', 'regex:/\A(?:[A-F0-9]{8}(?:-[A-F0-9]{8}){3}|[A-F0-9]{4}(?:-[A-F0-9]{4}){2})\z/i'],
            'password' => ['bail', 'required', 'string', 'min:8', 'max:255', 'confirmed', new CompatiblePassword],
        ]);

        $codigo = strtoupper($datos['recovery_code']);
        $porCorreo = strlen($codigo) === 14;
        $hashDeRelleno = Hash::make(bin2hex(random_bytes(16)));

        DB::transaction(function () use ($datos, $codigo, $porCorreo, $hashDeRelleno): void {
            // Generar y consumir bloquean al mismo usuario para impedir el uso simultáneo.
            $usuario = User::where('email', $datos['email'])->lockForUpdate()->first();
            $valido = $porCorreo
                ? $this->consumirCodigoCorreo($usuario, $codigo, $hashDeRelleno)
                : $this->consumirCodigoRespaldo($usuario, $codigo, $hashDeRelleno);

            if (! $usuario || ! $valido) {
                throw ValidationException::withMessages([
                    'recovery_code' => ['El correo o el código son incorrectos, o el código ya venció o se utilizó.'],
                ]);
            }

            $usuario->password = Hash::make($datos['password']);
            $usuario->setRememberToken(Str::random(60));
            $usuario->save();

            if (config('session.driver') === 'database') {
                DB::connection(config('session.connection'))
                    ->table(config('session.table', 'sessions'))
                    ->where('user_id', $usuario->id)->delete();
            }

            $this->tokensCorreo()->where('email', $usuario->email)->delete();

            DB::afterCommit(fn () => AvisoCorreo::enviar($usuario, 'contrasena_recuperada'));
        });

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            Auth::shouldUse('web');
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada. Inicia sesión con la nueva contraseña.',
        ])->header('Cache-Control', 'no-store');
    }

    private function consumirCodigoRespaldo(?User $usuario, string $codigo, string $hashDeRelleno): bool
    {
        $disponibles = $usuario
            ? RecoveryCode::where('user_id', $usuario->id)->whereNull('used_at')->lockForUpdate()->get()
            : collect();
        $codigoValido = null;

        for ($i = 0; $i < 6; $i++) {
            $guardado = $disponibles->get($i);
            $coincide = Hash::check($codigo, $guardado?->code_hash ?? $hashDeRelleno);
            if ($guardado && $coincide) {
                $codigoValido = $guardado;
            }
        }

        return $codigoValido !== null && RecoveryCode::whereKey($codigoValido->id)
            ->whereNull('used_at')->update(['used_at' => now()]) === 1;
    }

    private function consumirCodigoCorreo(?User $usuario, string $codigo, string $hashDeRelleno): bool
    {
        $consulta = $this->tokensCorreo()->where('email', $usuario?->email ?? '')
            ->where('created_at', '>', now()->subMinutes(CodigoRecuperacionCorreo::Minutos));
        $token = $consulta->value('token');
        $coincide = Hash::check($this->huellaCorreo($codigo, $usuario?->getAuthPassword() ?? ''), $token ?? $hashDeRelleno);

        // Un DELETE condicional consume el código una sola vez incluso en instalaciones MyISAM.
        return $usuario && $token && $coincide && $consulta->where('token', $token)->delete() === 1;
    }

    private function huellaCorreo(string $codigo, string $hashContrasena): string
    {
        return hash('sha256', $codigo.'|'.$hashContrasena);
    }

    private function tokensCorreo(): Builder
    {
        return DB::table(config('auth.passwords.users.table', 'password_reset_tokens'));
    }
}
