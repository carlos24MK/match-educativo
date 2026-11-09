<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'app')->name('inicio');
Route::view('/registro', 'app')->name('registro');
Route::view('/login', 'app')->name('login');
Route::view('/recuperar-contrasena', 'app')->name('recuperar-contrasena');

Route::view('/dashboard', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('dashboard');

Route::view('/perfil', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('perfil');

Route::view('/buscar-estudiantes', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('buscar-estudiantes');

Route::middleware(['auth:web', 'auth.session'])->group(function () {
    Route::view('/matches', 'app')->name('matches');
    Route::view('/mensajes', 'app')->name('mensajes');
    Route::view('/notificaciones', 'app')->name('notificaciones');
});

Route::view('/configuracion/seguridad', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('seguridad');
