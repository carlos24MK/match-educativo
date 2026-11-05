<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Perfil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerfilController extends Controller
{
    public function mostrar(Request $request): JsonResponse
    {
        $perfil = Perfil::where('user_id', $request->user()->id)->first();

        return response()->json($perfil?->only(['presentacion', 'ensena', 'aprende']) ?? [
            'presentacion' => '',
            'ensena' => [],
            'aprende' => [],
        ]);
    }

    public function guardar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'presentacion' => ['present', 'nullable', 'string', 'max:500'],
            'ensena' => ['present', 'array', 'list', 'max:10'],
            'ensena.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'aprende' => ['present', 'array', 'list', 'max:10'],
            'aprende.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
        ]);

        $datos['presentacion'] ??= '';

        // El perfil pertenece a la cuenta de la sesión, no a un ID enviado por el navegador.
        $perfil = Perfil::updateOrCreate(['user_id' => $request->user()->id], $datos);

        return response()->json($perfil->only(['presentacion', 'ensena', 'aprende']));
    }
}
