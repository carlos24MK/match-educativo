<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Perfil;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PerfilController extends Controller
{
    public function mostrar(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $perfil = Perfil::where('user_id', $usuario->id)->first();

        return $this->respuestaPerfil($usuario, $perfil);
    }

    public function guardar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:191'],
            'presentacion' => ['present', 'nullable', 'string', 'max:500'],
            'ensena' => ['present', 'array', 'list', 'max:10'],
            'ensena.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'aprende' => ['present', 'array', 'list', 'max:10'],
            'aprende.*' => ['required', 'string', 'max:60', 'distinct:ignore_case'],
            'visible_en_busqueda' => ['sometimes', 'boolean'],
            'programa' => ['sometimes', 'nullable', 'string', 'max:100'],
            'semestre' => ['sometimes', 'nullable', 'integer', 'between:1,12'],
            'preferencias_estudio' => ['sometimes', 'nullable', 'string', 'max:160'],
        ]);

        $datos['presentacion'] ??= '';
        foreach (['programa', 'preferencias_estudio'] as $campo) {
            if (array_key_exists($campo, $datos)) {
                $datos[$campo] ??= '';
            }
        }

        $usuario = $request->user();
        $nombre = $datos['nombre'] ?? null;
        unset($datos['nombre']);
        $perfil = DB::transaction(function () use ($usuario, $nombre, $datos): Perfil {
            // Bloquear la cuenta permite coordinar las escrituras aun sin un perfil previo.
            User::whereKey($usuario->id)->lockForUpdate()->firstOrFail();
            if ($nombre !== null) {
                $usuario->update(['name' => $nombre]);
            }

            return Perfil::updateOrCreate(['user_id' => $usuario->id], $datos);
        }, 3);

        return $this->respuestaPerfil($usuario, $perfil);
    }

    public function subirFoto(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'foto' => ['bail', 'required', 'file', 'max:2048', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:max_width=4096,max_height=4096'],
        ], [
            'foto.required' => 'Selecciona una foto de perfil.',
            'foto.uploaded' => 'No se pudo subir la foto. Comprueba que el archivo pese 2 MB o menos.',
            'foto.max' => 'La foto debe pesar 2 MB o menos.',
            'foto.image' => 'El archivo debe ser una imagen JPG, PNG o WebP.',
            'foto.mimes' => 'Usa una imagen JPG, PNG o WebP.',
            'foto.dimensions' => 'La foto debe medir hasta 4096 × 4096 píxeles.',
        ]);

        $ruta = $datos['foto']->store('fotos-perfil', ['disk' => 'local', 'visibility' => 'private']);
        abort_if($ruta === false, 500, 'No se pudo guardar la foto.');

        $perfil = $this->cambiarFoto((int) $request->user()->id, $ruta);

        return response()->json(['foto_url' => $perfil?->fotoUrl()]);
    }

    public function quitarFoto(Request $request): JsonResponse
    {
        $this->cambiarFoto((int) $request->user()->id, null);

        return response()->json(['foto_url' => null]);
    }

    public function mostrarFoto(Request $request, int $estudiante): Response
    {
        $perfil = Perfil::where('user_id', $estudiante)->first();
        abort_if($perfil?->foto_path === null, 404);
        abort_unless((int) $request->user()->id === $estudiante || $perfil->visible_en_busqueda, 404);

        $tipo = match (pathinfo($perfil->foto_path, PATHINFO_EXTENSION)) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => abort(404),
        };
        $contenido = Storage::disk('local')->get($perfil->foto_path);
        abort_if($contenido === null, 404);

        return response($contenido, 200, [
            'Content-Type' => $tipo,
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    private function respuestaPerfil(User $usuario, ?Perfil $perfil): JsonResponse
    {
        return response()->json([
            'nombre' => $usuario->name,
            'presentacion' => $perfil?->presentacion ?? '',
            'ensena' => $perfil?->ensena ?? [],
            'aprende' => $perfil?->aprende ?? [],
            'visible_en_busqueda' => $perfil?->visible_en_busqueda ?? false,
            'programa' => $perfil?->programa ?? '',
            'semestre' => $perfil?->semestre,
            'preferencias_estudio' => $perfil?->preferencias_estudio ?? '',
            'foto_url' => $perfil?->fotoUrl(),
        ]);
    }

    private function cambiarFoto(int $usuarioId, ?string $ruta): ?Perfil
    {
        $disco = Storage::disk('local');

        try {
            [$perfil, $anterior] = DB::transaction(function () use ($usuarioId, $ruta): array {
                User::whereKey($usuarioId)->lockForUpdate()->firstOrFail();
                $perfil = Perfil::where('user_id', $usuarioId)->first();
                if ($perfil === null && $ruta === null) {
                    return [null, null];
                }

                $perfil ??= new Perfil(['user_id' => $usuarioId, 'ensena' => [], 'aprende' => []]);
                $anterior = $perfil->foto_path;
                $perfil->foto_path = $ruta;
                $perfil->save();

                return [$perfil, $anterior];
            }, 3);
        } catch (Throwable $error) {
            if ($ruta !== null) {
                $disco->delete($ruta);
            }
            throw $error;
        }

        if ($anterior !== null) {
            $disco->delete($anterior);
        }

        return $perfil;
    }
}
