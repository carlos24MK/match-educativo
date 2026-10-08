<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecoveryCode;
use App\Models\User;
use App\Rules\CompatiblePassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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

            return $codigos;
        });

        return response()->json([
            'success' => true,
            'message' => 'Se generaron seis códigos. Descárgalos y guárdalos en un lugar seguro.',
            'data' => ['recovery_codes' => $codigos],
        ])->header('Cache-Control', 'no-store');
    }

    /** Consume un código y cambia la contraseña sin iniciar sesión automáticamente. */
    public function recuperar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'recovery_code' => ['required', 'string', 'regex:/\A[A-F0-9]{8}(?:-[A-F0-9]{8}){3}\z/i'],
            'password' => ['bail', 'required', 'string', 'min:8', 'max:255', 'confirmed', new CompatiblePassword],
        ]);

        $codigo = strtoupper($datos['recovery_code']);
        $hashDeRelleno = Hash::make(bin2hex(random_bytes(16)));

        DB::transaction(function () use ($datos, $codigo, $hashDeRelleno): void {
            // Generar y consumir bloquean al mismo usuario para impedir el uso simultáneo.
            $usuario = User::where('email', $datos['email'])->lockForUpdate()->first();
            $disponibles = $usuario
                ? RecoveryCode::where('user_id', $usuario->id)->whereNull('used_at')->lockForUpdate()->get()
                : collect();

            $codigoValido = null;

            // Siempre compara seis hashes, también cuando el correo no existe.
            for ($i = 0; $i < 6; $i++) {
                $guardado = $disponibles->get($i);
                $coincide = Hash::check($codigo, $guardado?->code_hash ?? $hashDeRelleno);

                if ($guardado && $coincide) {
                    $codigoValido = $guardado;
                }
            }

            if (! $usuario || ! $codigoValido) {
                throw ValidationException::withMessages([
                    'recovery_code' => ['El correo o el código son incorrectos, o el código ya fue utilizado.'],
                ]);
            }

            $codigoValido->update(['used_at' => now()]);
            $usuario->password = Hash::make($datos['password']);
            $usuario->setRememberToken(Str::random(60));
            $usuario->save();

            if (config('session.driver') === 'database') {
                DB::connection(config('session.connection'))
                    ->table(config('session.table', 'sessions'))
                    ->where('user_id', $usuario->id)->delete();
            }

            DB::table(config('auth.passwords.users.table', 'password_reset_tokens'))
                ->where('email', $usuario->email)->delete();
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
}
