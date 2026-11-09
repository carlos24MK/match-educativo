<?php

use App\Http\Controllers\Api\ContrasenaController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\MatchController;
use App\Http\Controllers\Api\MensajeController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\RecoveryCodeController;
use App\Http\Controllers\Api\RegistroController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::pattern('match', '[1-9][0-9]{0,17}');

Route::post('/registrar', [RegistroController::class, 'registrar'])
    ->middleware('throttle:5,1,registro');

Route::post('/login', [LoginController::class, 'login'])
    ->middleware('throttle:5,1,login');

Route::post('/recuperar-contrasena', [RecoveryCodeController::class, 'recuperar'])
    ->middleware('throttle:5,1,recovery');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [LogoutController::class, 'logout']);
    Route::get('/perfil', [PerfilController::class, 'mostrar']);
    Route::post('/perfil', [PerfilController::class, 'guardar']);
    Route::get('/estudiantes', [EstudianteController::class, 'buscar']);
    Route::get('/matches', [MatchController::class, 'index']);
    Route::post('/matches', [MatchController::class, 'store'])
        ->middleware('throttle:10,1,solicitudes-match');
    Route::post('/matches/{match}/responder', [MatchController::class, 'responder'])
        ->middleware('throttle:30,1,respuestas-match');
    Route::get('/matches/{match}/mensajes', [MensajeController::class, 'index']);
    Route::post('/matches/{match}/mensajes', [MensajeController::class, 'store'])
        ->middleware('throttle:30,1,mensajes');
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::post('/notificaciones/leer-todas', [NotificacionController::class, 'leerTodas']);
    Route::post('/notificaciones/{notificacion}/leer', [NotificacionController::class, 'leer'])->whereUuid('notificacion');
    Route::post('/configuracion/contrasena', [ContrasenaController::class, 'cambiar'])
        ->middleware('throttle:5,1,cambiar-contrasena');

    Route::get('/recovery-codes', [RecoveryCodeController::class, 'estado']);

    Route::post('/recovery-codes', [RecoveryCodeController::class, 'generar'])
        ->middleware('throttle:3,1,generar-codigos');
});
