<?php

use App\Http\Controllers\Api\ContrasenaController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\HorarioController;
use App\Http\Controllers\Api\LlamadaController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\MensajeController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\RecoveryCodeController;
use App\Http\Controllers\Api\RegistroController;
use App\Http\Controllers\Api\ReporteAdministrativoController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Middleware\EsAdministrador;
use App\Notifications\TiempoReal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::pattern('match', '[1-9][0-9]{0,17}');
Route::pattern('llamada', '[1-9][0-9]{0,17}');

Route::post('/registrar', [RegistroController::class, 'registrar'])
    ->middleware('throttle:5,1,registro');

Route::post('/login', [LoginController::class, 'login'])
    ->middleware('throttle:5,1,login');

Route::post('/recuperar-contrasena', [RecoveryCodeController::class, 'recuperar'])
    ->middleware('throttle:5,1,recovery');

Route::post('/solicitar-codigo-recuperacion', [RecoveryCodeController::class, 'enviarCodigo'])
    ->middleware('throttle:5,1,recovery-correo');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/tiempo-real/config', function (Request $request, TiempoReal $tiempoReal) {
        abort_unless($tiempoReal->disponible(), 503);
        $config = config('services.pusher');

        return response()->json(['key' => $config['key'], 'cluster' => $config['cluster'], 'user_id' => $request->user()->id]);
    });

    Route::post('/tiempo-real/auth', function (Request $request, TiempoReal $tiempoReal) {
        $datos = $request->validate([
            'socket_id' => ['required', 'string', 'regex:/^[0-9]+\.[0-9]+$/'],
            'channel_name' => ['required', 'string'],
        ]);
        abort_unless($datos['channel_name'] === 'private-user.'.$request->user()->id, 403);
        abort_unless($tiempoReal->disponible(), 503);
        $pusher = $tiempoReal->cliente();

        return response($pusher->authorizeChannel($datos['channel_name'], $datos['socket_id']), 200)->header('Content-Type', 'application/json');
    });
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [LogoutController::class, 'logout']);
    Route::get('/perfil', [PerfilController::class, 'mostrar']);
    Route::post('/perfil', [PerfilController::class, 'guardar']);
    Route::get('/horarios', [HorarioController::class, 'mostrar']);
    Route::post('/horarios', [HorarioController::class, 'guardar'])->middleware('throttle:20,1,horarios');
    Route::get('/reportes', [ReporteController::class, 'index']);
    Route::post('/reportes', [ReporteController::class, 'store'])->middleware('throttle:5,1,reportes');
    Route::prefix('administracion')->middleware(EsAdministrador::class)->group(function () {
        Route::get('/reportes', [ReporteAdministrativoController::class, 'index']);
        Route::post('/reportes/{reporte}', [ReporteAdministrativoController::class, 'actualizar'])
            ->where('reporte', '[1-9][0-9]{0,17}')->middleware('throttle:30,1,administrar-reportes');
    });
    Route::post('/perfil/foto', [PerfilController::class, 'subirFoto'])
        ->middleware('throttle:10,1,foto-perfil');
    Route::delete('/perfil/foto', [PerfilController::class, 'quitarFoto']);
    Route::get('/estudiantes', [EstudianteController::class, 'buscar']);
    Route::get('/estudiantes/{estudiante}/foto', [PerfilController::class, 'mostrarFoto'])
        ->where('estudiante', '[1-9][0-9]{0,17}')->name('estudiantes.foto');
    Route::get('/matches', [MatchController::class, 'index']);
    Route::post('/matches', [MatchController::class, 'store'])
        ->middleware('throttle:10,1,solicitudes-match');
    Route::post('/matches/{match}/responder', [MatchController::class, 'responder'])
        ->middleware('throttle:30,1,respuestas-match');
    Route::get('/matches/{match}/mensajes', [MensajeController::class, 'index']);
    Route::post('/matches/{match}/mensajes', [MensajeController::class, 'store'])
        ->middleware('throttle:30,1,mensajes');
    Route::post('/matches/{match}/mensajes/escritura', [MensajeController::class, 'escritura'])
        ->middleware('throttle:60,1,escritura');
    Route::get('/llamadas', [LlamadaController::class, 'index'])
        ->middleware('throttle:180,1,llamadas-lectura');
    Route::get('/llamadas/{llamada}', [LlamadaController::class, 'mostrar'])
        ->middleware('throttle:180,1,llamadas-lectura');
    Route::post('/matches/{match}/llamadas', [LlamadaController::class, 'store'])
        ->middleware('throttle:10,1,llamadas-inicio');
    Route::post('/llamadas/{llamada}/responder', [LlamadaController::class, 'responder'])
        ->middleware('throttle:30,1,llamadas-respuesta');
    Route::post('/llamadas/{llamada}/senales', [LlamadaController::class, 'senal'])
        ->middleware('throttle:150,1,llamadas-senales');
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::post('/notificaciones/leer-todas', [NotificacionController::class, 'leerTodas']);
    Route::post('/notificaciones/{notificacion}/leer', [NotificacionController::class, 'leer'])->whereUuid('notificacion');
    Route::post('/configuracion/contrasena', [ContrasenaController::class, 'cambiar'])
        ->middleware('throttle:5,1,cambiar-contrasena');

    Route::get('/recovery-codes', [RecoveryCodeController::class, 'estado']);

    Route::post('/recovery-codes', [RecoveryCodeController::class, 'generar'])
        ->middleware('throttle:3,1,generar-codigos');
});
