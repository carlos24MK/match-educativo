<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\CompatiblePassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContrasenaController extends Controller
{
    public function cambiar(Request $request): JsonResponse
    {
        abort_unless($request->hasSession(), 419);

        $datos = $request->validate([
            'current_password' => ['bail', 'required', 'string', 'max:255', new CompatiblePassword],
            'password' => ['bail', 'required', 'string', 'min:8', 'max:255', 'confirmed', 'different:current_password', new CompatiblePassword],
        ]);

        $usuarioId = $request->user()->getAuthIdentifier();

        DB::transaction(function () use ($usuarioId, $datos): void {
            $usuario = User::whereKey($usuarioId)->lockForUpdate()->firstOrFail();

            if (! Hash::check($datos['current_password'], $usuario->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['La contraseña actual es incorrecta.'],
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

            DB::table(config('auth.passwords.users.table', 'password_reset_tokens'))
                ->where('email', $usuario->email)->delete();
        });

        // Cierra también la sesión que acaba de cambiar la contraseña.
        Auth::guard('web')->logoutCurrentDevice();
        Auth::shouldUse('web');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Contraseña actualizada. Inicia sesión con la nueva contraseña.',
        ]);
    }
}
