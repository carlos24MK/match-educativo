<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\CompatiblePassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RegistroController extends Controller
{
    public function registrar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email'],
            'password' => ['bail', 'required', 'string', 'min:8', 'max:255', 'confirmed', new CompatiblePassword],

        ]);

        $usuario = User::create([

            'name' => $datos['name'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),

        ]);

        return response()->json([
            'success' => true,
            'message' => 'usuario registrado correctamente',
            'data' => [
                'user' => $usuario->only(['id', 'name', 'email']),
            ],

        ], 201);
    }
}
