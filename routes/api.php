<?php

use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\RecoveryCodeController;
use App\Http\Controllers\Api\RegistroController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

    Route::get('/recovery-codes', [RecoveryCodeController::class, 'estado']);

    Route::post('/recovery-codes', [RecoveryCodeController::class, 'generar'])
        ->middleware('throttle:3,1,generar-codigos');
});
