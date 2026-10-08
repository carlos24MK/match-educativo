<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\CompatiblePassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        // Comprueba los datos recibidos del formulario.
        $credenciales = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'password' => ['bail', 'required', 'string', 'max:255', new CompatiblePassword],
        ]);

        abort_unless($request->hasSession(), 419, 'Prepara la sesión antes de iniciar sesión.');

        if (! Auth::guard('web')->attempt($credenciales)) {
            throw ValidationException::withMessages([
                'email' => ['El correo o la contraseña son incorrectos.'],
            ]);
        }

        $request->session()->regenerate();

        /** @var User $usuario */
        $usuario = Auth::guard('web')->user();

        return response()->json([
            'success' => true,
            'message' => 'Sesión iniciada correctamente',
            'data' => [
                'user' => $usuario->only(['id', 'name', 'email']),
            ],
        ], 200);
    }
}
