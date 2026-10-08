<?php

use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\RegistroController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::post('/registrar', [RegistroController::class, 'registrar']);

Route::post('/login', [LoginController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', 
    function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [LogoutController::class, 'logout']);
});